import type { BookingStatus } from '../../constants/enums';
import { FINAL_STATUSES } from './stateMachine';

interface MoneyFacts {
  readonly status: BookingStatus;
  /** Stored at creation (§5.5): total − paidOnline, the part meant to be paid at the salon. */
  readonly money: { readonly remaining: number };
}

/**
 * What the customer still owes at the salon now, in fils (BUSINESS_DOMAIN §5.5).
 * Open bookings (PENDING, APPROVED) owe the stored `remaining`. A final booking owes nothing:
 * COMPLETED means it was settled at the salon (paymentStatus PAID, §5.7), and a rejected,
 * cancelled or no-show booking is not collected at the salon.
 */
export const outstandingAtSalon = (b: MoneyFacts): number =>
  FINAL_STATUSES.includes(b.status) ? 0 : b.money.remaining;

/** What the salon collected in person, in fils: the stored `remaining` once COMPLETED, else 0. */
export const paidAtSalon = (b: MoneyFacts): number =>
  b.status === 'COMPLETED' ? b.money.remaining : 0;
