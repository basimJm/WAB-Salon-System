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
} as const;
export const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,39}$/;
export const REASON_TEXT_MAX_LENGTH = 300;

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
