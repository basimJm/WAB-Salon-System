import type { BookingMoney } from '../../models/booking.model';
import type { SalonPolicy } from '../../models/salon.model';
import { percentOf } from '../../utils/money';

export interface RefundFacts {
  readonly paymentMethod: 'PAY_ON_ARRIVAL' | 'DEPOSIT' | 'FULL_ONLINE';
  readonly money: Pick<BookingMoney, 'total' | 'paidOnline'>;
  readonly policy: Pick<
    SalonPolicy,
    'depositPercentage' | 'depositRefundableOnCustomerCancel' | 'fullPaymentRefundOnCustomerCancel'
  >;
}

/** The deposit part of the total under the booking's policy snapshot; 0 when it defines none. */
const depositOf = (facts: RefundFacts): number =>
  facts.policy.depositPercentage === undefined
    ? 0
    : percentOf(facts.money.total, facts.policy.depositPercentage);

/**
 * Refund (integer fils) when the customer cancels an APPROVED booking inside the window
 * (BUSINESS_DOMAIN.md §5.8). Never more than what was paid online. Pending bookings are refunded
 * in full instead: use `fullRefund`.
 */
export const customerCancelRefund = (facts: RefundFacts): number => {
  const paid = facts.money.paidOnline;
  if (facts.paymentMethod === 'PAY_ON_ARRIVAL' || paid <= 0) return 0;
  if (facts.paymentMethod === 'DEPOSIT') {
    return facts.policy.depositRefundableOnCustomerCancel ? paid : 0;
  }
  if (facts.policy.fullPaymentRefundOnCustomerCancel === 'FULL') return paid;
  const deposit = depositOf(facts);
  // Without a deposit percentage nothing can be kept, so the whole payment comes back.
  return deposit === 0 ? paid : Math.max(0, Math.min(paid, facts.money.total - deposit));
};

/** Rejection, salon cancellation, auto-cancel and a pending customer cancel return everything paid. */
export const fullRefund = (facts: Pick<RefundFacts, 'money'>): number =>
  Math.max(0, facts.money.paidOnline);
