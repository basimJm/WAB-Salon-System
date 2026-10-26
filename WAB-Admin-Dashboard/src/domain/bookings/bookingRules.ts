import { filsToJod, isJodString, jodToFils } from '@/domain/shared/money';
import type { BookingDetails, BookingStaff } from './bookings';

/** Statuses a booking can still be moved or cancelled in. */
const OPEN_STATUSES = ['PENDING', 'APPROVED'];

/** Only an approved booking whose appointment has not started can get another staff member (server rule). */
export const canReassign = (
  b: Pick<BookingDetails, 'status' | 'appointmentStart'>,
  now: Date = new Date(),
): boolean => b.status === 'APPROVED' && new Date(b.appointmentStart).getTime() > now.getTime();
export const canCancel = (b: Pick<BookingDetails, 'status'>): boolean =>
  OPEN_STATUSES.includes(b.status);

/** What is still refundable: paid online minus what was already refunded (JOD, 3 decimals). */
export function maxRefund(money: Pick<BookingDetails['money'], 'paidOnline' | 'refunded'>): string {
  const left = jodToFils(money.paidOnline) - jodToFils(money.refunded);
  return filsToJod(Math.max(left, 0));
}

export const canRefund = (b: Pick<BookingDetails, 'money'>): boolean =>
  jodToFils(maxRefund(b.money)) > 0;

/** A positive JOD amount that is not more than what is refundable. */
export function isRefundAmount(amount: string, max: string): boolean {
  return isJodString(amount) && jodToFils(amount) > 0 && jodToFils(amount) <= jodToFils(max);
}

/** Each staff member once, in the order the persons list them (two persons can share one stylist). */
export function uniqueStaff(staff: readonly BookingStaff[]): readonly BookingStaff[] {
  const seen = new Set<string>();
  return staff.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}
