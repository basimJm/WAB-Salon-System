import type { Types } from 'mongoose';
import { LEDGER_RECONCILE_BATCH_SIZE } from '../../constants/ledger';
import { PAYOUT_LEDGER_NOTE } from '../../constants/payouts';
import { RECONCILE_MIN_AGE_MS } from '../../constants/payments';
import type { LedgerType } from '../../constants/enums';
import type { LedgerEntryRaw } from '../../models/ledgerEntry.model';
import type { PayoutRaw } from '../../models/payout.model';
import type { RefundRaw } from '../../models/refund.model';
import type { LedgerRepository } from '../../repositories/ledger.repository';
import type { RefundsRepository } from '../../repositories/refunds.repository';
import type { TransactionsRepository } from '../../repositories/transactions.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import type { Logger } from '../../utils/logger';

export interface SalonTotals {
  /** Σ of everything: what WAB owes the salon (negative = the salon owes WAB). */
  readonly balance: number;
  readonly charges: number;
  readonly gatewayFees: number;
  readonly refunds: number;
  readonly payouts: number;
  readonly adjustments: number;
}

export interface LedgerService {
  /**
   * Books the online payment of a booking: CHARGE +amount and GATEWAY_FEE −fee when the gateway
   * reported one (BUSINESS_DOMAIN.md §5.6 step 4). Idempotent. `false` when there is nothing to book.
   */
  recordChargeForBooking(bookingId: string): Promise<boolean>;
  /** Books a finished refund: REFUND −amount (the gateway fee is not returned). Idempotent. */
  recordRefund(refund: Entity<RefundRaw>): Promise<boolean>;
  /** Books a transferred payout: PAYOUT −net. Idempotent. */
  recordPayout(payout: Entity<PayoutRaw>): Promise<void>;
  /** The salon's balance and the sum per kind of entry. */
  totals(salonId: string): Promise<SalonTotals>;
  /** Job: books payments and refunds whose ledger write was missed; returns how many were booked. */
  reconcile(): Promise<number>;
}

/** Ledger rows of a payment carry its branch so finance can be filtered by branch (§5.14). */
const branchOf = (payment: { branchId?: string | undefined }): { branchId?: Types.ObjectId } =>
  payment.branchId === undefined ? {} : { branchId: toObjectId(payment.branchId) };

export const createLedgerService = (deps: {
  readonly entries: LedgerRepository;
  readonly transactions: TransactionsRepository;
  readonly refunds: Pick<RefundsRepository, 'markLedgered' | 'unledgered'>;
  readonly logger: Logger;
  readonly now?: () => Date;
}): LedgerService => {
  const { entries, transactions, refunds, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  /** Appends once: the unique indexes (and this check) turn a repeat into a no-op. */
  const appendOnce = async (
    entry: Partial<LedgerEntryRaw>,
    existing: () => Promise<Entity<LedgerEntryRaw> | null>,
  ): Promise<void> => {
    if ((await existing()) !== null) return;
    try {
      await entries.append(entry);
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  };

  const chargeFor = async (bookingId: string): Promise<boolean> => {
    const payment = await transactions.findOne({ bookingId, status: 'SUCCEEDED' });
    if (payment === null || payment.chargedAt !== undefined) return false;
    const base = {
      salonId: toObjectId(payment.salonId),
      ...branchOf(payment),
      bookingId: toObjectId(bookingId),
      transactionId: toObjectId(payment.id),
    };
    await appendOnce({ ...base, type: 'CHARGE', amount: payment.amount }, () =>
      entries.findFor({ transactionId: payment.id, type: 'CHARGE' }),
    );
    if (payment.gatewayFee !== undefined && payment.gatewayFee > 0) {
      await appendOnce(
        { ...base, type: 'GATEWAY_FEE', amount: -payment.gatewayFee, note: 'gateway fee' },
        () => entries.findFor({ transactionId: payment.id, type: 'GATEWAY_FEE' }),
      );
    }
    await transactions.markCharged(payment.id, now());
    return true;
  };

  const refundFor = async (refund: Entity<RefundRaw>): Promise<boolean> => {
    const payment = await transactions.findById(refund.transactionId);
    if (payment?.chargedAt === undefined) {
      // No booking ever existed: nothing to book, ever, so stop looking. With a booking the charge is only late.
      if (payment !== null && payment.bookingId === undefined) {
        await refunds.markLedgered(refund.id, now());
      }
      return false;
    }
    await appendOnce(
      {
        salonId: toObjectId(refund.salonId),
        ...branchOf(payment),
        type: 'REFUND',
        amount: -refund.amount,
        ...(refund.bookingId === undefined ? {} : { bookingId: toObjectId(refund.bookingId) }),
        transactionId: toObjectId(refund.transactionId),
        refundId: toObjectId(refund.id),
      },
      () => entries.findFor({ refundId: refund.id }),
    );
    await refunds.markLedgered(refund.id, now());
    return true;
  };

  return {
    recordChargeForBooking: chargeFor,
    recordRefund: refundFor,

    async recordPayout(payout) {
      await appendOnce(
        {
          salonId: toObjectId(payout.salonId),
          type: 'PAYOUT',
          amount: -payout.net,
          payoutId: toObjectId(payout.id),
          note: PAYOUT_LEDGER_NOTE,
        },
        () => entries.findFor({ payoutId: payout.id }),
      );
    },

    async totals(salonId) {
      const sum = (type?: LedgerType): Promise<number> => entries.sum(salonId, type);
      const [balance, charges, gatewayFees, refunds, payouts, adjustments] = await Promise.all([
        sum(),
        sum('CHARGE'),
        sum('GATEWAY_FEE'),
        sum('REFUND'),
        sum('PAYOUT'),
        sum('ADJUSTMENT'),
      ]);
      return { balance, charges, gatewayFees, refunds, payouts, adjustments };
    },

    async reconcile() {
      const cutoff = new Date(now().getTime() - RECONCILE_MIN_AGE_MS);
      let booked = 0;
      for (const payment of await transactions.unchargedWithBooking(
        cutoff,
        LEDGER_RECONCILE_BATCH_SIZE,
      )) {
        if (payment.bookingId === undefined) continue;
        try {
          if (await chargeFor(payment.bookingId)) booked += 1;
        } catch (error) {
          logger.warn({ err: error, transactionId: payment.id }, 'ledger reconciliation failed');
        }
      }
      for (const refund of await refunds.unledgered(cutoff, LEDGER_RECONCILE_BATCH_SIZE)) {
        try {
          if (await refundFor(refund)) booked += 1;
        } catch (error) {
          logger.warn({ err: error, refundId: refund.id }, 'ledger reconciliation failed');
        }
      }
      return booked;
    },
  };
};
