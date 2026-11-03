/** Bookings (SRV-071, BUSINESS_DOMAIN.md §3.5 `bookings`, §5.6). */
export const BOOKINGS_COLLECTION = 'bookings';
export const BOOKING_ROUTES = { base: '/bookings' } as const;
/** Lock segment for the per-staff, per-date creation lock (`lock:staff:<staffId>:<date>`). */
export const STAFF_LOCK_SEGMENT = 'staff';
export const STAFF_LOCK_TTL_MS = 10_000;
export const BOOKING_RATE_LIMIT = { windowMs: 60_000, max: 60 } as const;

/** Merchant booking actions (SRV-073, BUSINESS_DOMAIN.md §5.7). */
export const MERCHANT_BOOKING_ROUTES = {
  base: '/bookings',
  approve: '/:id/approve',
  reject: '/:id/reject',
  complete: '/:id/complete',
  noShow: '/:id/no-show',
  cancel: '/:id/cancel',
  reassign: '/:id/reassign',
  /** SRV-128a: who could take over one person, before reassigning. */
  eligibleStaff: '/:id/eligible-staff',
} as const;
export const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,39}$/;
export const REASON_TEXT_MAX_LENGTH = 300;
/** Lifetime of the signed URL of a tattoo design image on booking details (§5.23). */
export const REFERENCE_IMAGE_URL_TTL_SEC = 300;

export const CUSTOMER_BOOKING_ROUTES = { cancel: '/:id/cancel' } as const;
/** Reason code stored when the customer cancels (no code is asked in the app). */
export const CUSTOMER_CANCEL_REASON_CODE = 'CUSTOMER_REQUEST';

/** Booking queries (SRV-077): list tabs, calendar window, search limits. */
export const BOOKING_TABS = ['PENDING', 'UPCOMING', 'TODAY', 'PAST'] as const;
export type BookingTab = (typeof BOOKING_TABS)[number];
export const CUSTOMER_BOOKING_TABS = ['UPCOMING', 'PAST'] as const;
/** At most this many days per calendar request (week view). */
export const CALENDAR_MAX_DAYS = 7;
/** Free-text search looks at most this many customers/salons up. */
export const BOOKING_SEARCH_LOOKUP_LIMIT = 50;
export const BOOKING_SEARCH_MAX_LENGTH = 60;
export const BOOKING_FILTER_MAX_ITEMS = 20;
export const MERCHANT_BOOKING_QUERY_ROUTES = { calendar: '/calendar', byId: '/:id' } as const;
export const ADMIN_BOOKING_ROUTES = { base: '/bookings', byId: '/:id' } as const;
/** Calendar blocks show only bookings that occupy or occupied the staff member's time. */
export const CALENDAR_STATUSES = ['PENDING', 'APPROVED', 'COMPLETED', 'NO_SHOW'] as const;
export type BookingAction = 'APPROVE' | 'REJECT' | 'CANCEL' | 'REASSIGN' | 'COMPLETE' | 'NO_SHOW';

/** Admin booking status changes (SRV-078, Admin PRD A15). */
export const ADMIN_BOOKING_STATUS_ROUTE = '/:id/status';
export const ADMIN_BOOKING_AUDIT = {
  action: 'BOOKING_STATUS_CHANGE',
  entityType: 'BOOKING',
  reasonCode: 'ADMIN_ACTION',
} as const;

/** Admin booking extras (SRV-123, Admin PRD A15): eligible staff, reassign, cancel by mode, chosen-amount refund. */
export const ADMIN_BOOKING_EXTRA_ROUTES = {
  eligibleStaff: '/:id/eligible-staff',
  reassign: '/:id/reassign',
  cancel: '/:id/cancel',
  refund: '/:id/refund',
} as const;
/**
 * Who a cancellation is booked for. The mode decides the status and the refund rule:
 * CUSTOMER = the customer asked (policy refund; everything while PENDING), SALON = the salon
 * cancels (full refund), ADMIN = the platform decides (full refund, recorded as a salon-side
 * cancellation because no separate status exists; the history keeps the admin as the actor).
 */
export const ADMIN_CANCEL_MODES = ['CUSTOMER', 'SALON', 'ADMIN'] as const;
export type AdminCancelMode = (typeof ADMIN_CANCEL_MODES)[number];
export const ADMIN_BOOKING_EXTRA_AUDIT = {
  entityType: 'BOOKING',
  cancel: 'BOOKING_ADMIN_CANCEL',
  reassign: 'BOOKING_ADMIN_REASSIGN',
  refund: 'BOOKING_ADMIN_REFUND',
} as const;

/** Bulk cancellation of the bookings a schedule/team change would break (SRV-079, §5.12). */
export const MERCHANT_CANCEL_AFFECTED_ROUTE = '/cancel-affected';
export const CANCEL_AFFECTED_MAX_BOOKINGS = 100;

/** Background jobs of a booking (SRV-096, BUSINESS_DOMAIN.md §9). */
export const AUTO_CANCEL_REASON = 'AUTO_CANCEL';
export const BOOKING_JOB_NAMES = {
  reminder: 'booking.reminder',
  pendingAlert: 'booking.pending-alert',
  autoCancel: 'booking.auto-cancel',
} as const;
/** The reminder minutes that have a message template; other values of the setting are ignored. */
export const REMINDER_EVENT_BY_MINUTES = {
  60: 'booking.reminder_1h',
  15: 'booking.reminder_15m',
} as const;
/** Active bookings handed to the planner per database page when jobs are rebuilt. */
export const JOB_RECONCILE_PAGE_SIZE = 200;
