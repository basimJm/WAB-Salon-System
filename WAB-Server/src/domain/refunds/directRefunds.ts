import { ERROR_CODES } from '../../constants/errorCodes';
import type { PaymentProvider } from '../../providers/payments/types';
import type { TransactionsRepository } from '../../repositories/transactions.repository';
import type { Logger } from '../../utils/logger';

/** Why a whole payment is handed back without a booking behind it (BUSINESS_DOMAIN.md §5.6 step 5). */
export type FullRefundReason = 'SLOT_UNAVAILABLE' | 'NO_BOOKING';

/**
 * Hands one payment back in full. This is the immediate refund the booking flow needs when a slot is
 * lost after payment; the refund records, retries and admin tools of §5.10 are the refund service
 * (SRV-086), which implements this same port.
 */
export interface FullRefundPort {
  /** `true` when the gateway accepted the refund (done or on its way); idempotent per payment. */
  refundPayment(input: { transactionId: string; reason: FullRefundReason }): Promise<boolean>;
}

export const createDirectRefunds = (deps: {
  readonly transactions: Pick<TransactionsRepository, 'findById' | 'markRefunded'>;
  readonly provider: Pick<PaymentProvider, 'refund'>;
  readonly logger: Logger;
  readonly now?: () => Date;
}): FullRefundPort => {
  const { transactions, provider, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());
  return {
    async refundPayment({ transactionId, reason }) {
      const payment = await transactions.findById(transactionId);
      if (payment?.status !== 'SUCCEEDED' || payment.providerRef === undefined) return false;
      if (payment.refundedAt !== undefined) return true;
      const result = await provider.refund({
        // One payment is refunded once, however often this is retried.
        idempotencyKey: `refund:${payment.id}`,
        sessionId: payment.providerRef,
        amountFils: payment.amount,
      });
      if (result.status === 'REFUND_FAILED') {
        logger.error(
          { transactionId, reason, gatewayCode: result.gatewayCode },
          `full refund rejected by the gateway (${ERROR_CODES.PAYMENT_FAILED})`,
        );
        return false;
      }
      await transactions.markRefunded(payment.id, now());
      return true;
    },
  };
};
