import { BOOKING_STATUSES, type BookingStatus } from '../src/constants/enums';
import { outstandingAtSalon, paidAtSalon } from '../src/domain/bookings/bookingMoney';
import { FINAL_STATUSES } from '../src/domain/bookings/stateMachine';

// SRV-170: `money.remaining` is what is still owed at the salon now (BUSINESS_DOMAIN §5.5).
const REMAINING = 94_080;
const booking = (
  status: BookingStatus,
): { status: BookingStatus; money: { remaining: number } } => ({
  status,
  money: { remaining: REMAINING },
});

describe('booking money at the salon', () => {
  it('open bookings still owe the stored remaining', () => {
    expect(outstandingAtSalon(booking('PENDING'))).toBe(REMAINING);
    expect(outstandingAtSalon(booking('APPROVED'))).toBe(REMAINING);
  });

  it('every final booking owes nothing at the salon', () => {
    for (const status of FINAL_STATUSES) expect(outstandingAtSalon(booking(status))).toBe(0);
  });

  it('only a COMPLETED booking was paid at the salon', () => {
    for (const status of BOOKING_STATUSES) {
      expect(paidAtSalon(booking(status))).toBe(status === 'COMPLETED' ? REMAINING : 0);
    }
  });

  it('a fully paid online booking has nothing at the salon in any status', () => {
    for (const status of BOOKING_STATUSES) {
      const paid = { status, money: { remaining: 0 } };
      expect(outstandingAtSalon(paid)).toBe(0);
      expect(paidAtSalon(paid)).toBe(0);
    }
  });
});
