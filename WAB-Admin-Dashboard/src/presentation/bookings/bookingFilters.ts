import {
  BOOKING_TABS,
  PAYMENT_STATUSES,
  isBookingStatus,
  type BookingQuery,
  type BookingTab,
  type PaymentStatus,
} from '@/domain/bookings/bookings';
import type { ListState } from '@/domain/shared/listState';
import { isLocalDate, localDayRange } from '@/domain/shared/time';

export const BOOKING_FILTER_KEYS = [
  'tab',
  'status',
  'payment',
  'bride',
  'from',
  'to',
  'salon',
  'customer',
];
const first = (state: ListState, key: string): string | undefined => state.filters[key]?.[0];

/** The URL list state -> the API query (invalid values are dropped; days are Amman days, `to` is inclusive). */
export function bookingQueryOf(state: ListState): BookingQuery {
  const tab: BookingTab | undefined = BOOKING_TABS.find((t) => t === first(state, 'tab'));
  const payment: PaymentStatus | undefined = PAYMENT_STATUSES.find(
    (p) => p === first(state, 'payment'),
  );
  const status = first(state, 'status');
  const from = first(state, 'from');
  const to = first(state, 'to');
  const salon = first(state, 'salon');
  const customer = first(state, 'customer');
  return {
    page: state.page,
    pageSize: state.pageSize,
    ...(tab ? { tab } : {}),
    ...(isBookingStatus(status) ? { status: [status] } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(first(state, 'bride') === 'true' ? { brideOnly: true } : {}),
    ...(from && isLocalDate(from) ? { from: localDayRange(from).start.toISOString() } : {}),
    ...(to && isLocalDate(to) ? { to: localDayRange(to).end.toISOString() } : {}),
    ...(salon ? { salonId: salon } : {}),
    ...(customer ? { customerId: customer } : {}),
    ...(state.search ? { q: state.search } : {}),
  };
}
