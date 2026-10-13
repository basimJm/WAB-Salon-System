import { RECONCILE_MIN_AGE_MS } from '../../constants/payments';
import { RECONCILIATION_LIMIT } from '../../constants/adminFinance';
import type { TransactionStatus, TransactionType } from '../../constants/enums';
import type { TransactionRaw } from '../../models/transaction.model';
import type { TransactionsRepository } from '../../repositories/transactions.repository';
import { NotFoundError } from '../../utils/errors';
import { ERROR_CODES } from '../../constants/errorCodes';
import { isObjectIdString } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import type { PaginationParams } from '../../utils/pagination';

export interface TransactionFilter {
  readonly status?: TransactionStatus | undefined;
  readonly type?: TransactionType | undefined;
  readonly salonId?: string | undefined;
  readonly customerId?: string | undefined;
  readonly bookingId?: string | undefined;
  readonly from?: Date | undefined;
  readonly to?: Date | undefined;
}

export interface TransactionDetail {
  readonly transaction: Entity<TransactionRaw>;
  /** Every attempt of the same checkout, newest first (includes this one). */
  readonly attempts: Entity<TransactionRaw>[];
}

/** Payment problems an admin should look at; each list is capped and oldest first. */
export interface Reconciliation {
  /** Still PENDING at the gateway after the polling delay. */
  readonly stuckPending: Entity<TransactionRaw>[];
  /** Paid but no booking was created and no refund yet. */
  readonly paidWithoutBooking: Entity<TransactionRaw>[];
  /** Paid bookings whose ledger charge is missing. */
  readonly missingLedger: Entity<TransactionRaw>[];
}

export interface AdminTransactionsService {
  list(input: {
    params: PaginationParams;
    filter: TransactionFilter;
  }): Promise<{ items: Entity<TransactionRaw>[]; total: number }>;
  get(id: string): Promise<TransactionDetail>;
  reconciliation(now: Date): Promise<Reconciliation>;
}

export const createAdminTransactionsService = (deps: {
  transactions: TransactionsRepository;
}): AdminTransactionsService => ({
  async list({ params, filter }) {
    const query: Record<string, unknown> = {};
    for (const key of ['status', 'type', 'salonId', 'customerId', 'bookingId'] as const) {
      const value = filter[key];
      if (value !== undefined) query[key] = value;
    }
    if (filter.from !== undefined || filter.to !== undefined) {
      query.createdAt = {
        ...(filter.from === undefined ? {} : { $gte: filter.from }),
        ...(filter.to === undefined ? {} : { $lt: filter.to }),
      };
    }
    const page = await deps.transactions.findPage(query, params, { createdAt: -1 });
    return { items: page.items, total: page.meta.total };
  },

  async get(id) {
    const transaction = isObjectIdString(id) ? await deps.transactions.findById(id) : null;
    if (transaction === null) {
      throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    }
    const attempts =
      transaction.bookingDraftId === undefined
        ? [transaction]
        : await deps.transactions.attemptsOf(transaction.bookingDraftId);
    return { transaction, attempts };
  },

  async reconciliation(now) {
    const cutoff = new Date(now.getTime() - RECONCILE_MIN_AGE_MS);
    const [stuckPending, paidWithoutBooking, missingLedger] = await Promise.all([
      deps.transactions.pendingBefore(cutoff, RECONCILIATION_LIMIT),
      deps.transactions.orphansBefore(cutoff, RECONCILIATION_LIMIT),
      deps.transactions.unchargedWithBooking(cutoff, RECONCILIATION_LIMIT),
    ]);
    return { stuckPending, paidWithoutBooking, missingLedger };
  },
});
