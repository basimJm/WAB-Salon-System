import {
  REFUND_BATCH_SIZE,
  REFUND_ERROR_MAX_LENGTH,
  REFUND_RETRY_BASE_DELAY_MS,
  REFUND_AUDIT,
} from '../../constants/refunds';
import type { RefundSource } from '../../constants/enums';
import { ADMIN_BOOKING_EXTRA_AUDIT } from '../../constants/bookings';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { MS_PER_HOUR } from '../../constants/time';
import type { RefundRaw } from '../../models/refund.model';
import type { PaymentProvider } from '../../providers/payments/types';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { RefundsRepository } from '../../repositories/refunds.repository';
import type { TransactionsRepository } from '../../repositories/transactions.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { BaseError, BusinessRuleError, NotFoundError, ValidationError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { SettingsService } from '../settings';
import type { FullRefundPort, FullRefundReason } from './directRefunds';

export interface RefundHooks {
  /** A refund was created and is on its way (the customer is told). */
  started?(refund: Entity<RefundRaw>): Promise<void>;
  /** A refund reached the customer: the ledger entry `REFUND −amount` is written here (SRV-087). */
  refunded?(refund: Entity<RefundRaw>): Promise<void>;
  /** Retries ran out: alert the admin. */
  failed?(refund: Entity<RefundRaw>): Promise<void>;
}

export interface RefundService extends FullRefundPort {
  /**
   * Starts a refund of `amount` fils of the booking's online payment (capped at what is still
   * refundable) and makes the first attempt. `null` when nothing was paid online or nothing is left.
   */
  requestForBooking(input: {
    bookingId: string;
    amount: number;
    source: RefundSource;
    reason?: string | undefined;
  }): Promise<Entity<RefundRaw> | null>;
  /**
   * Admin: refunds a chosen amount (integer fils) of the booking's online payment with a reason.
   * More than what is still refundable is refused (400 `body.amount`); a booking nobody paid online
   * for is 422. The first attempt runs at once; failures retry like any refund.
   */
  refundBookingAmount(input: {
    bookingId: string;
    amount: number;
    reason: string;
    actor: AdminActor;
  }): Promise<Entity<RefundRaw>>;
  /** One attempt for a pending refund (idempotent at the gateway). */
  attempt(refundId: string): Promise<Entity<RefundRaw> | null>;
  /** Job: attempts every refund that is due (retries with backoff, gateway-pending polls); returns how many were tried. */
  runDue(): Promise<number>;
  /** Job: refunds pending longer than `refund.delayAlertHours`, for the admin alert. */
  delayed(): Promise<Entity<RefundRaw>[]>;
  list(input: {
    params: PaginationParams;
    status?: RefundRaw['status'] | undefined;
    bookingId?: string | undefined;
    salonId?: string | undefined;
    branchId?: string | undefined;
  }): Promise<{ items: Entity<RefundRaw>[]; total: number }>;
  get(id: string): Promise<Entity<RefundRaw>>;
  /** Admin: a failed refund gets a fresh set of attempts. */
  retry(input: { refundId: string; reason: string; actor: AdminActor }): Promise<Entity<RefundRaw>>;
  /** Admin: the money was returned outside the gateway (bank transfer); a reference is required. */
  markManual(input: {
    refundId: string;
    reference: string;
    reason: string;
    actor: AdminActor;
  }): Promise<Entity<RefundRaw>>;
}

export interface RefundServiceDeps {
  readonly refunds: RefundsRepository;
  readonly transactions: TransactionsRepository;
  readonly bookings: Pick<BookingsRepository, 'recordRefund'>;
  readonly provider: PaymentProvider;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly audit: AuditWriter;
  readonly logger: Logger;
  readonly hooks?: RefundHooks;
  readonly now?: () => Date;
}

const SOURCE_OF_REASON: Record<FullRefundReason, RefundSource> = {
  // §5.6 step 5: a slot lost after payment is booked as a salon-side rejection.
  SLOT_UNAVAILABLE: 'SALON_REJECT',
  NO_BOOKING: 'AUTO_CANCEL',
};

export const createRefundService = (deps: RefundServiceDeps): RefundService => {
  const { refunds, transactions, bookings, provider, settings, audit, logger } = deps;
  const hooks = deps.hooks ?? {};
  /** A hook (ledger, notification) must never undo or fail a refund: its errors are logged. */
  const runHook = async (name: keyof RefundHooks, refund: Entity<RefundRaw>): Promise<void> => {
    try {
      await hooks[name]?.(refund);
    } catch (error) {
      logger.error({ err: error, refundId: refund.id, hook: name }, 'refund hook failed');
    }
  };
  const now = deps.now ?? ((): Date => new Date());

  const notFound = (): NotFoundError => new NotFoundError({ code: ERROR_CODES.NOT_FOUND });

  const syncBooking = async (
    refund: Entity<RefundRaw>,
    status: 'REFUND_PENDING' | 'REFUNDED' | 'REFUND_FAILED',
    refundedDelta = 0,
  ): Promise<void> => {
    if (refund.bookingId !== undefined) {
      await bookings.recordRefund(refund.bookingId, { status, refundedDelta });
    }
  };

  const finish = async (
    refund: Entity<RefundRaw>,
    set: Record<string, unknown>,
  ): Promise<Entity<RefundRaw> | null> => {
    const done = await refunds.transition(refund.id, ['REFUND_PENDING', 'REFUND_FAILED'], {
      ...set,
      status: 'REFUNDED',
      completedAt: now(),
    });
    if (done === null) return null;
    await syncBooking(done, 'REFUNDED', done.amount);
    await runHook('refunded', done);
    return done;
  };

  const fail = async (
    refund: Entity<RefundRaw>,
    message: string,
    rejected = false,
  ): Promise<Entity<RefundRaw>> => {
    const attempts = refund.attempts + 1;
    const max = await settings.get('refund.maxRetries');
    const lastError = message.slice(0, REFUND_ERROR_MAX_LENGTH);
    if (attempts >= max) {
      const given = await refunds.transition(
        refund.id,
        'REFUND_PENDING',
        {
          status: 'REFUND_FAILED',
          attempts,
          lastError,
        },
        ['nextAttemptAt'],
      );
      if (given === null) return (await refunds.findById(refund.id)) ?? refund;
      await syncBooking(given, 'REFUND_FAILED');
      await runHook('failed', given);
      return given;
    }
    const delay = REFUND_RETRY_BASE_DELAY_MS * 2 ** (attempts - 1);
    return (
      (await refunds.transition(refund.id, 'REFUND_PENDING', {
        attempts,
        lastError,
        ...(rejected ? { gatewayRound: refund.gatewayRound + 1 } : {}),
        nextAttemptAt: new Date(now().getTime() + delay),
      })) ?? refund
    );
  };

  const attempt = async (refundId: string): Promise<Entity<RefundRaw> | null> => {
    const refund = await refunds.findById(refundId);
    if (refund === null) return null;
    if (refund.status !== 'REFUND_PENDING') return refund;
    const payment = await transactions.findById(refund.transactionId);
    if (payment?.providerRef === undefined) return fail(refund, 'payment has no gateway session');
    try {
      const result =
        refund.providerRef === undefined
          ? await provider.refund({
              idempotencyKey: `${refund.idempotencyKey}:${String(refund.gatewayRound)}`,
              sessionId: payment.providerRef,
              amountFils: refund.amount,
            })
          : await provider.getRefund(refund.providerRef);
      if (result.status === 'REFUNDED') {
        return (
          (await finish(refund, { providerRef: result.refundId })) ??
          (await refunds.findById(refundId))
        );
      }
      if (result.status === 'REFUND_PENDING') {
        // The gateway is still working on it: ask again later, without counting a failure.
        return (
          (await refunds.transition(refund.id, 'REFUND_PENDING', {
            providerRef: result.refundId,
            nextAttemptAt: new Date(now().getTime() + REFUND_RETRY_BASE_DELAY_MS),
          })) ?? refund
        );
      }
      return await fail(refund, `${result.gatewayCode}: ${result.gatewayMessage}`, true);
    } catch (error) {
      if (!(error instanceof BaseError)) throw error;
      logger.warn({ err: error, refundId }, 'refund attempt failed');
      return await fail(refund, error.message);
    }
  };

  /** Creates the refund row (or returns the one that already exists for this key) and tries it. */
  const request = async (input: {
    transactionId: string;
    bookingId?: string | undefined;
    amount: number;
    source: RefundSource;
    reason?: string | undefined;
    idempotencyKey: string;
  }): Promise<Entity<RefundRaw> | null> => {
    // The same cancellation reported twice (a retried hook, a double tap) is one refund.
    const existing = await refunds.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing !== null) return existing;
    const payment = await transactions.findById(input.transactionId);
    if (payment?.status !== 'SUCCEEDED') return null;
    const available = payment.amount - (await refunds.committedFor(payment.id));
    const amount = Math.min(input.amount, available);
    if (amount <= 0) return null;
    let row: Entity<RefundRaw>;
    try {
      row = await refunds.create({
        ...(input.bookingId === undefined ? {} : { bookingId: toObjectId(input.bookingId) }),
        transactionId: toObjectId(payment.id),
        salonId: toObjectId(payment.salonId),
        ...(payment.branchId === undefined ? {} : { branchId: toObjectId(payment.branchId) }),
        customerId: toObjectId(payment.customerId),
        amount,
        source: input.source,
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        status: 'REFUND_PENDING',
        idempotencyKey: input.idempotencyKey,
        attempts: 0,
        gatewayRound: 0,
      });
    } catch (error) {
      // The same cancellation reported twice: the first refund already covers it.
      if (!isDuplicateKeyError(error)) throw error;
      return refunds.findOne({ idempotencyKey: input.idempotencyKey });
    }
    // A fully refunded payment can never back a booking.
    if (amount === payment.amount) await transactions.markRefunded(payment.id, now());
    await syncBooking(row, 'REFUND_PENDING');
    await runHook('started', row);
    return (await attempt(row.id)) ?? row;
  };

  const requireRefund = async (id: string): Promise<Entity<RefundRaw>> => {
    const found = await refunds.findById(id);
    if (found === null) throw notFound();
    return found;
  };

  const record = async (
    actor: AdminActor,
    action: string,
    before: Entity<RefundRaw>,
    after: Entity<RefundRaw>,
    reason: string,
  ): Promise<void> => {
    await audit.record({
      adminId: actor.adminId,
      action,
      entityType: REFUND_AUDIT.entityType,
      entityId: after.id,
      before: { status: before.status, attempts: before.attempts },
      after: { status: after.status, attempts: after.attempts },
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  };

  return {
    async requestForBooking({ bookingId, amount, source, reason }) {
      const payment = await transactions.findOne({ bookingId, status: 'SUCCEEDED' });
      if (payment === null) return null;
      const sameSource =
        source === 'ADMIN' ? (await refunds.findMany({ bookingId, source })).length + 1 : 1;
      return request({
        transactionId: payment.id,
        bookingId,
        amount,
        source,
        reason,
        idempotencyKey: `refund:${bookingId}:${source}${source === 'ADMIN' ? `:${String(sameSource)}` : ''}`,
      });
    },

    async refundBookingAmount({ bookingId, amount, reason, actor }) {
      const payment = await transactions.findOne({ bookingId, status: 'SUCCEEDED' });
      if (payment === null) throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      const available = payment.amount - (await refunds.committedFor(payment.id));
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > available) {
        throw new ValidationError({
          code: ERROR_CODES.VALIDATION_ERROR,
          details: [
            {
              field: 'body.amount',
              code: ERROR_CODES.VALIDATION_ERROR,
              messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
            },
          ],
        });
      }
      const row = await request({
        transactionId: payment.id,
        bookingId,
        amount,
        source: 'ADMIN',
        reason,
        idempotencyKey: `refund:${bookingId}:ADMIN:${String((await refunds.findMany({ bookingId, source: 'ADMIN' })).length + 1)}`,
      });
      if (row === null) throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      await audit.record({
        adminId: actor.adminId,
        action: ADMIN_BOOKING_EXTRA_AUDIT.refund,
        entityType: ADMIN_BOOKING_EXTRA_AUDIT.entityType,
        entityId: bookingId,
        before: { paid: payment.amount, refundable: available },
        after: { refundId: row.id, amount: row.amount, status: row.status },
        reason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      return row;
    },

    async refundPayment({ transactionId, reason }) {
      const payment = await transactions.findById(transactionId);
      if (payment === null) return false;
      const row = await request({
        transactionId,
        amount: payment.amount,
        source: SOURCE_OF_REASON[reason],
        reason,
        idempotencyKey: `refund:${transactionId}`,
      });
      return row !== null && row.status !== 'REFUND_FAILED';
    },

    attempt,

    async runDue() {
      const due = await refunds.dueForAttempt(now(), REFUND_BATCH_SIZE);
      let tried = 0;
      for (const refund of due) {
        try {
          await attempt(refund.id);
          tried += 1;
        } catch (error) {
          logger.warn({ err: error, refundId: refund.id }, 'refund job attempt crashed');
        }
      }
      return tried;
    },

    async delayed() {
      const hours = await settings.get('refund.delayAlertHours');
      return refunds.pendingBefore(
        new Date(now().getTime() - hours * MS_PER_HOUR),
        REFUND_BATCH_SIZE,
      );
    },

    async list({ params, status, bookingId, salonId, branchId }) {
      const page = await refunds.findPage(
        {
          ...(status === undefined ? {} : { status }),
          ...(bookingId === undefined ? {} : { bookingId }),
          ...(salonId === undefined ? {} : { salonId }),
          ...(branchId === undefined ? {} : { branchId }),
        },
        params,
        { createdAt: -1 },
      );
      return { items: page.items, total: page.meta.total };
    },

    get: requireRefund,

    async retry({ refundId, reason, actor }) {
      const before = await requireRefund(refundId);
      if (before.status !== 'REFUND_FAILED') {
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      }
      const reopened = await refunds.transition(
        refundId,
        'REFUND_FAILED',
        { status: 'REFUND_PENDING', attempts: 0 },
        ['lastError', 'nextAttemptAt'],
      );
      if (reopened === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      await syncBooking(reopened, 'REFUND_PENDING');
      const after = (await attempt(refundId)) ?? reopened;
      await record(actor, REFUND_AUDIT.retry, before, after, reason);
      return after;
    },

    async markManual({ refundId, reference, reason, actor }) {
      const before = await requireRefund(refundId);
      const done = await finish(before, {
        manual: { by: toObjectId(actor.adminId), reference },
      });
      if (done === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      await record(actor, REFUND_AUDIT.manual, before, done, reason);
      return done;
    },
  };
};
