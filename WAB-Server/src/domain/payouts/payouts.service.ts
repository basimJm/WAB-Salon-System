import { PAYOUT_AUDIT } from '../../constants/payouts';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { PayoutStatus } from '../../constants/enums';
import type { PayoutRaw } from '../../models/payout.model';
import type { LedgerRepository } from '../../repositories/ledger.repository';
import type { PayoutsRepository } from '../../repositories/payouts.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { LedgerService, SalonTotals } from '../ledger/ledger.service';

/** The epoch: where a salon's first payout starts. */
const EPOCH = new Date(0);

export interface PayoutPreview {
  readonly salonId: string;
  readonly periodFrom: Date;
  readonly periodTo: Date;
  /** Positive magnitudes in fils; `net = gross − fees − refunds + adjustments`. */
  readonly gross: number;
  readonly fees: number;
  readonly refunds: number;
  readonly adjustments: number;
  readonly net: number;
}

/** Tells the owner and FINANCE_VIEW members about a transfer (push/in-app arrive with SRV-093). */
export interface PayoutNotifier {
  transferred(payout: Entity<PayoutRaw>): Promise<void>;
}

export interface SalonBalance {
  readonly salonId: string;
  readonly name: string;
  readonly totals: SalonTotals;
  /** Not yet in any payout: what a new payout would pay (negative = the salon owes WAB). */
  readonly dueNow: number;
  readonly lastPayout: { periodTo: Date; net: number; status: PayoutStatus } | null;
}

export interface PayoutsService {
  /** What a payout for the salon up to `periodTo` would contain; nothing is stored. */
  preview(input: { salonId: string; periodTo: Date }): Promise<PayoutPreview>;
  /** Stores the payout as PENDING (one open payout per salon); the amount must be positive. */
  create(input: {
    salonId: string;
    periodTo: Date;
    note?: string | undefined;
    actor: AdminActor;
  }): Promise<Entity<PayoutRaw>>;
  /** Records the transfer: status TRANSFERRED and the ledger entry PAYOUT −net. */
  markTransferred(input: {
    payoutId: string;
    /** What was transferred, in fils: it must equal the payout's net (a different sum is a new payout). */
    amount: number;
    transferredAt: Date;
    transferReference: string;
    /** Shown in the audit log as the reason. */
    note: string;
    actor: AdminActor;
  }): Promise<Entity<PayoutRaw>>;
  list(input: {
    params: PaginationParams;
    salonId?: string | undefined;
    status?: PayoutStatus | undefined;
  }): Promise<{ items: Entity<PayoutRaw>[]; total: number }>;
  get(id: string): Promise<Entity<PayoutRaw>>;
  /** One salon's balance, what is due now and its last payout (also the merchant's finance card). */
  balanceOf(salonId: string): Promise<SalonBalance>;
  /** Balances of a page of salons (Admin PRD A18). */
  balances(params: PaginationParams): Promise<{ items: SalonBalance[]; total: number }>;
}

export const createPayoutsService = (deps: {
  readonly payouts: PayoutsRepository;
  readonly ledgerEntries: Pick<LedgerRepository, 'sumInPeriod'>;
  readonly ledger: Pick<LedgerService, 'recordPayout' | 'totals'>;
  readonly salons: Pick<SalonsRepository, 'findById' | 'findPage'>;
  readonly audit: AuditWriter;
  readonly notifier: PayoutNotifier;
  readonly logger: Logger;
  readonly now?: () => Date;
}): PayoutsService => {
  const { payouts, ledgerEntries, ledger, salons, audit, notifier, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const invalid = (field: string): ValidationError =>
    new ValidationError({
      code: ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field,
          code: ERROR_CODES.VALIDATION_ERROR,
          messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
        },
      ],
    });

  const requireSalon = async (salonId: string): Promise<void> => {
    if ((await salons.findById(salonId)) === null) {
      throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    }
  };

  /** Everything between the end of the previous payout and `periodTo`. */
  const compute = async (salonId: string, periodTo: Date): Promise<PayoutPreview> => {
    const previous = await payouts.latestFor(salonId);
    const periodFrom = previous?.periodTo ?? EPOCH;
    if (periodTo > now()) throw invalid('periodTo');
    if (periodTo <= periodFrom) throw invalid('periodTo');
    const [charges, fees, refunds, adjustments] = await Promise.all([
      ledgerEntries.sumInPeriod(salonId, 'CHARGE', periodFrom, periodTo),
      ledgerEntries.sumInPeriod(salonId, 'GATEWAY_FEE', periodFrom, periodTo),
      ledgerEntries.sumInPeriod(salonId, 'REFUND', periodFrom, periodTo),
      ledgerEntries.sumInPeriod(salonId, 'ADJUSTMENT', periodFrom, periodTo),
    ]);
    return {
      salonId,
      periodFrom,
      periodTo,
      gross: charges,
      fees: -fees,
      refunds: -refunds,
      adjustments,
      net: charges + fees + refunds + adjustments,
    };
  };

  const record = (
    actor: AdminActor,
    action: string,
    payout: Entity<PayoutRaw>,
    before: object | undefined,
    reason: string,
  ): Promise<unknown> =>
    audit.record({
      adminId: actor.adminId,
      action,
      entityType: PAYOUT_AUDIT.entityType,
      entityId: payout.id,
      ...(before === undefined ? {} : { before }),
      after: { status: payout.status, net: payout.net, periodTo: payout.periodTo.toISOString() },
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

  const balanceFor = async (salon: { id: string; name: string }): Promise<SalonBalance> => {
    const [totals, last] = await Promise.all([
      ledger.totals(salon.id),
      payouts.latestFor(salon.id),
    ]);
    const periodFrom = last?.periodTo ?? EPOCH;
    const sinceLast = await Promise.all(
      (['CHARGE', 'GATEWAY_FEE', 'REFUND', 'ADJUSTMENT'] as const).map((type) =>
        ledgerEntries.sumInPeriod(salon.id, type, periodFrom, now()),
      ),
    );
    return {
      salonId: salon.id,
      name: salon.name,
      totals,
      dueNow: sinceLast.reduce((sum, v) => sum + v, 0),
      lastPayout:
        last === null ? null : { periodTo: last.periodTo, net: last.net, status: last.status },
    };
  };

  const requirePayout = async (id: string): Promise<Entity<PayoutRaw>> => {
    const found = await payouts.findById(id);
    if (found === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return found;
  };

  return {
    async preview({ salonId, periodTo }) {
      await requireSalon(salonId);
      return compute(salonId, periodTo);
    },

    async create({ salonId, periodTo, note, actor }) {
      await requireSalon(salonId);
      const open = await payouts.findOne({ salonId, status: 'PENDING' });
      if (open !== null) throw new ConflictError({ code: ERROR_CODES.ALREADY_HANDLED });
      const calc = await compute(salonId, periodTo);
      // Nothing (or a negative balance) is not paid out; the admin sees why and picks another end.
      if (calc.net <= 0) throw invalid('periodTo');
      let created: Entity<PayoutRaw>;
      try {
        created = await payouts.create({
          salonId: toObjectId(salonId),
          periodFrom: calc.periodFrom,
          periodTo: calc.periodTo,
          gross: calc.gross,
          fees: calc.fees,
          refunds: calc.refunds,
          adjustments: calc.adjustments,
          net: calc.net,
          status: 'PENDING',
          ...(note === undefined ? {} : { note }),
          createdBy: toObjectId(actor.adminId),
        });
      } catch (error) {
        // Two admins at once: the unique "one open payout" index decides.
        if (isDuplicateKeyError(error))
          throw new ConflictError({ code: ERROR_CODES.ALREADY_HANDLED });
        throw error;
      }
      await record(actor, PAYOUT_AUDIT.create, created, undefined, note ?? PAYOUT_AUDIT.create);
      return created;
    },

    async markTransferred({ payoutId, amount, transferredAt, transferReference, note, actor }) {
      const before = await requirePayout(payoutId);
      if (before.status !== 'PENDING') {
        throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      }
      if (transferredAt > now()) throw invalid('transferredAt');
      if (amount !== before.net) throw invalid('amount');
      const done = await payouts.markTransferred(payoutId, {
        transferredAt,
        transferReference,
        note,
      });
      if (done === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      await ledger.recordPayout(done);
      await record(actor, PAYOUT_AUDIT.transfer, done, { status: before.status }, note);
      try {
        await notifier.transferred(done);
      } catch (error) {
        logger.warn({ err: error, payoutId }, 'payout notification failed');
      }
      return done;
    },

    async list({ params, salonId, status }) {
      const page = await payouts.findPage(
        {
          ...(salonId === undefined ? {} : { salonId }),
          ...(status === undefined ? {} : { status }),
        },
        params,
        { createdAt: -1 },
      );
      return { items: page.items, total: page.meta.total };
    },

    get: requirePayout,

    async balanceOf(salonId) {
      const salon = await salons.findById(salonId);
      if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      return balanceFor(salon);
    },

    async balances(params) {
      const page = await salons.findPage({}, params, { name: 1 });
      return { items: await Promise.all(page.items.map(balanceFor)), total: page.meta.total };
    },
  };
};
