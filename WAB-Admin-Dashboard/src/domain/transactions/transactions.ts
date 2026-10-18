import type { Page, PageQuery } from '@/domain/shared/page';

export const TRANSACTION_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const;
export const TRANSACTION_TYPES = ['DEPOSIT', 'FULL'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** One payment attempt at the gateway (amounts are JOD decimal strings). */
export interface Transaction {
  readonly id: string;
  readonly bookingDraftId: string | null;
  readonly bookingId: string | null;
  readonly customerId: string;
  readonly salonId: string;
  readonly type: TransactionType;
  readonly amount: string;
  readonly currency: string;
  readonly attempt: number;
  readonly provider: string;
  readonly providerRef: string | null;
  readonly status: TransactionStatus;
  readonly gatewayCode: string | null;
  readonly gatewayMessage: string | null;
  readonly gatewayFee: string | null;
  readonly refundedAt: string | null;
  readonly chargedAt: string | null;
  readonly platform: string;
  readonly appVersion: string;
  readonly createdAt: string;
}
export interface TransactionDetails extends Transaction {
  /** The gateway's own answer, shown as received. */
  readonly raw: Record<string, unknown> | null;
  /** Every attempt of the same checkout, oldest first. */
  readonly attempts: readonly Transaction[];
}

export interface TransactionQuery extends PageQuery {
  status?: TransactionStatus;
  type?: TransactionType;
  salonId?: string;
  customerId?: string;
  bookingId?: string;
  from?: string;
  to?: string;
}

/** Payment problems the admin must look at: each list holds attempts, never totals. */
export interface Reconciliation {
  /** Still PENDING long after the customer left the checkout. */
  readonly stuckPending: readonly Transaction[];
  /** The gateway took the money but no booking exists (refund or fix). */
  readonly paidWithoutBooking: readonly Transaction[];
  /** A booking exists but the ledger has no charge entry for it. */
  readonly missingLedger: readonly Transaction[];
}
export const RECONCILIATION_KINDS = [
  'stuckPending',
  'paidWithoutBooking',
  'missingLedger',
] as const;
export type ReconciliationKind = (typeof RECONCILIATION_KINDS)[number];

export interface TransactionsRepository {
  reconciliation(): Promise<Reconciliation>;
  list(query: TransactionQuery): Promise<Page<Transaction>>;
  get(id: string): Promise<TransactionDetails>;
}
