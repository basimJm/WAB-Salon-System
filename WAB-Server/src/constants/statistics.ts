import type { BookingStatus } from './enums';

/** Merchant statistics (SRV-132, Merchant PRD M21, `STATISTICS_VIEW`). */
export const MERCHANT_STATISTICS_ROUTES = { base: '/statistics' } as const;
/** Longest period one request may cover (days, both ends included). */
export const STATISTICS_MAX_RANGE_DAYS = 92;
/** How many services and staff the rankings show. */
export const STATISTICS_TOP_COUNT = 5;
/** Rates are percentages with one decimal. */
export const STATISTICS_RATE_SCALE = 10;
export const STATISTICS_PERCENT = 100;
/** Server event written each time a customer opens a salon page (profile views KPI). */
export const SALON_VIEWED_EVENT = 'salon.viewed';
/** Statuses that count as cancelled for the cancellation rate. */
export const CANCELLED_BOOKING_STATUSES: readonly BookingStatus[] = [
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SALON',
  'AUTO_CANCELLED',
];
/** Bookings that took (or will take) place: they count for revenue and rankings. */
export const ATTENDED_BOOKING_STATUSES: readonly BookingStatus[] = ['APPROVED', 'COMPLETED'];
