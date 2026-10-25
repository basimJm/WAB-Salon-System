import type { Page, PageQuery } from '@/domain/shared/page';

export const REFUND_STATUSES = ['REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];
export type RefundSource =
  'SALON_REJECT' | 'SALON_CANCEL' | 'AUTO_CANCEL' | 'CUSTOMER_CANCEL' | 'NO_SHOW_POLICY' | 'ADMIN';

export interface Refund {
  readonly id: string;
  readonly bookingId: string | null;
  readonly transactionId: string;
  readonly salonId: string;
  readonly branchId: string | null;
  readonly customerId: string;
  readonly amount: string;
  readonly source: RefundSource;
  readonly reason: string | null;
  readonly status: RefundStatus;
  readonly attempts: number;
  readonly lastError: string | null;
  readonly nextAttemptAt: string | null;
  readonly completedAt: string | null;
  readonly manual: { readonly by: string; readonly reference: string } | null;
  readonly createdAt: string;
}

export interface RefundQuery extends PageQuery {
  status?: RefundStatus;
  bookingId?: string;
  salonId?: string;
  branchId?: string;
}

export interface RefundsRepository {
  list(query: RefundQuery): Promise<Page<Refund>>;
  retry(id: string, reason: string): Promise<Refund>;
  /** The money was returned outside the gateway: keep the bank reference. */
  markManual(id: string, reference: string, reason: string): Promise<Refund>;
}

/** A refund the system should already have retried (pending or failed, next attempt in the past). */
export function isOverdue(refund: Refund, now: Date): boolean {
  if (refund.status === 'REFUNDED' || !refund.nextAttemptAt) return false;
  return Date.parse(refund.nextAttemptAt) < now.getTime();
}
export const canAct = (refund: Refund): boolean => refund.status !== 'REFUNDED';
export const MAX_REFERENCE = 100;
