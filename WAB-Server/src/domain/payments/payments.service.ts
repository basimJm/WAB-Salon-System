import {
  AMOUNT_MISMATCH_CODE,
  IDEMPOTENCY_SEPARATOR,
  PAYMENT_CURRENCY,
} from '../../constants/payments';
import type { Platform, TransactionStatus, TransactionType } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { TransactionRaw } from '../../models/transaction.model';
import type { PaymentProvider } from '../../providers/payments/types';
import type { BookingDraftsRepository } from '../../repositories/bookingDrafts.repository';
import type { CustomersRepository } from '../../repositories/identity.repository';
import type { TransactionsRepository } from '../../repositories/transactions.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { formatJod } from '../../utils/money';
import type { Logger } from '../../utils/logger';

export interface PaymentView {
  readonly transactionId: string;
  readonly draftId: string | null;
  readonly status: TransactionStatus;
  readonly type: TransactionType;
  readonly attempt: number;
  /** JOD decimal string. */
  readonly amount: string;
  readonly currency: string;
  /** The gateway's checkout session the app pays with. */
  readonly sessionId: string | null;
  readonly gatewayCode: string | null;
  readonly gatewayMessage: string | null;
}

export interface PaymentsService {
  /**
   * Starts (or resumes) the online payment of a confirmed draft (BUSINESS_DOMAIN.md §5.6 step 3).
   * A running attempt is returned again; after a failed or cancelled one a new attempt starts.
   */
  start(input: {
    customerId: string;
    draftId: string;
    platform: Platform;
    appVersion: string;
  }): Promise<PaymentView>;
  /** Asks the gateway for the real outcome: the app's word is never trusted. */
  verify(input: { customerId: string; transactionId: string }): Promise<PaymentView>;
}

export interface PaymentsDeps {
  readonly transactions: TransactionsRepository;
  readonly drafts: Pick<BookingDraftsRepository, 'findById' | 'updateById'>;
  readonly customers: Pick<CustomersRepository, 'findById'>;
  readonly provider: PaymentProvider;
  /** Name stored on each attempt (which gateway handled it). */
  readonly providerName: string;
  readonly logger: Logger;
  readonly now?: () => Date;
}

const view = (t: Entity<TransactionRaw>): PaymentView => ({
  transactionId: t.id,
  draftId: t.bookingDraftId ?? null,
  status: t.status,
  type: t.type,
  attempt: t.attempt,
  amount: formatJod(t.amount),
  currency: t.currency,
  sessionId: t.providerRef ?? null,
  gatewayCode: t.gatewayCode ?? null,
  gatewayMessage: t.gatewayMessage ?? null,
});

export const createPaymentsService = (deps: PaymentsDeps): PaymentsService => {
  const { transactions, drafts, customers, provider, providerName, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  return {
    async start({ customerId, draftId, platform, appVersion }) {
      const customer = await customers.findById(customerId);
      if (customer?.status !== 'ACTIVE') {
        throw new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
      }
      const draft = await drafts.findById(draftId);
      if (draft?.customerId !== customerId) {
        throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      }
      if (draft.expiresAt <= now()) {
        throw new BusinessRuleError({ code: ERROR_CODES.DRAFT_EXPIRED });
      }
      if (draft.otpVerifiedAt === undefined) {
        throw new BusinessRuleError({ code: ERROR_CODES.OTP_INVALID });
      }
      if (draft.totals.dueOnline <= 0 || draft.paymentMethod === 'PAY_ON_ARRIVAL') {
        throw new BusinessRuleError({ code: ERROR_CODES.PAYMENT_OPTION_NOT_ALLOWED });
      }

      const attempts = await transactions.attemptsOf(draft.id);
      const last = attempts[0];
      // A running or successful attempt is the answer; only a failed/cancelled one allows a new try.
      if (last !== undefined && (last.status === 'PENDING' || last.status === 'SUCCEEDED')) {
        return view(last);
      }
      const attempt = (last?.attempt ?? 0) + 1;
      const idempotencyKey = `${draft.id}${IDEMPOTENCY_SEPARATOR}${String(attempt)}`;
      const session = await provider.createSession({
        idempotencyKey,
        amountFils: draft.totals.dueOnline,
        reference: draft.id,
      });
      try {
        const created = await transactions.create({
          bookingDraftId: toObjectId(draft.id),
          customerId: toObjectId(customerId),
          salonId: toObjectId(draft.salonId),
          type: draft.paymentMethod === 'DEPOSIT' ? 'DEPOSIT' : 'FULL',
          amount: draft.totals.dueOnline,
          currency: PAYMENT_CURRENCY,
          idempotencyKey,
          attempt,
          provider: providerName,
          providerRef: session.sessionId,
          // Whatever the gateway says now, only `verify` may settle an attempt.
          status: 'PENDING',
          platform,
          appVersion,
        });
        await drafts.updateById(draft.id, { transactionId: toObjectId(created.id) });
        return view(created);
      } catch (error) {
        // Two taps at once: the unique key makes the second one return the first checkout.
        if (!isDuplicateKeyError(error)) throw error;
        const existing = await transactions.findOne({ idempotencyKey });
        if (existing === null) throw error;
        return view(existing);
      }
    },

    async verify({ customerId, transactionId }) {
      const found = await transactions.findById(transactionId);
      if (found?.customerId !== customerId) {
        throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      }
      if (found.status !== 'PENDING' || found.providerRef === undefined) return view(found);

      const result = await provider.verify(found.providerRef);
      if (result.status === 'PENDING') return view(found);
      const mismatch = result.status === 'SUCCEEDED' && result.amountFils !== found.amount;
      if (mismatch) {
        logger.error(
          { transactionId: found.id, expected: found.amount, got: result.amountFils },
          'gateway amount differs from the requested amount',
        );
      }
      const settled = await transactions.settle(found.id, 'PENDING', {
        status: mismatch ? 'FAILED' : result.status,
        gatewayCode: mismatch ? AMOUNT_MISMATCH_CODE : result.gatewayCode,
        gatewayMessage: mismatch ? AMOUNT_MISMATCH_CODE : result.gatewayMessage,
        ...(result.feeFils === undefined ? {} : { gatewayFee: result.feeFils }),
        raw: {
          verifiedAt: now().toISOString(),
          status: result.status,
          amountFils: result.amountFils,
          gatewayCode: result.gatewayCode,
        },
      });
      // A concurrent verify or webhook settled it first: report what is stored now.
      const current = settled ?? (await transactions.findById(found.id)) ?? found;
      return view(current);
    },
  };
};
