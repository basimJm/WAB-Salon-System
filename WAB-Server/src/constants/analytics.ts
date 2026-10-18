/** Admin analytics from the server events in MongoDB (SRV-105, Admin PRD A01, A07-A09). */
export const ADMIN_ANALYTICS_ROUTES = {
  base: '/analytics',
  events: '/events',
  overview: '/overview',
} as const;
/** Longest range one query may cover (days). */
export const ANALYTICS_MAX_RANGE_DAYS = 92;
/** Answers are cached this long; dashboards refresh more often than data changes. */
export const ANALYTICS_CACHE_TTL_SEC = 60;
export const ANALYTICS_CACHE_PREFIX = 'analytics';
export const ANALYTICS_MAX_NAMES = 20;
/** Event names the server emits per dashboard section (dotted, lower case). */
export const ANALYTICS_SECTIONS = {
  payments: ['payment.started', 'payment.succeeded', 'payment.failed', 'payment.cancelled'],
  refunds: ['refund.created', 'refund.completed', 'refund.failed'],
  bookings: [
    'booking.created',
    'booking.approved',
    'booking.rejected',
    'booking.cancelled',
    'booking.completed',
    'booking.no_show',
    'booking.auto_cancelled',
  ],
  errors: ['api.error', 'otp.failed', 'otp.blocked'],
} as const;
export type AnalyticsSection = keyof typeof ANALYTICS_SECTIONS;
export const IDENTITY_LINKED_EVENT = 'identity.linked';
