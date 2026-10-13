/** Why a whole payment is handed back without a booking behind it (BUSINESS_DOMAIN.md §5.6 step 5). */
export type FullRefundReason = 'SLOT_UNAVAILABLE' | 'NO_BOOKING';

/**
 * Hands one payment back in full: what the booking and payment flows need when a slot is lost after
 * payment or a checkout is abandoned. The refund service (`refunds.service.ts`) implements it.
 */
export interface FullRefundPort {
  /** `true` when the gateway accepted the refund (done or on its way); idempotent per payment. */
  refundPayment(input: { transactionId: string; reason: FullRefundReason }): Promise<boolean>;
}
