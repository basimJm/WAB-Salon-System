import {
  BOOKING_STATUSES,
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

/**
 * What a BOOKINGS export accepts: the list's filters except the tab and the bride switch. The server's bookings export
 * fails with GENERATION_FAILED when the job has no params at all, so "no filter" is sent as "every status".
 */
export function bookingExportParams(q: BookingQuery): Record<string, unknown> {
  return {
    statuses: q.status && q.status.length > 0 ? [...q.status] : [...BOOKING_STATUSES],
    ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
    ...(q.salonId ? { salonId: q.salonId } : {}),
    ...(q.customerId ? { customerId: q.customerId } : {}),
    ...(q.from ? { from: q.from } : {}),
    ...(q.to ? { to: q.to } : {}),
    ...(q.q ? { q: q.q } : {}),
  };
}
