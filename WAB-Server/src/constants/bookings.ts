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
} as const;
export const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,39}$/;
export const REASON_TEXT_MAX_LENGTH = 300;

export const CUSTOMER_BOOKING_ROUTES = { cancel: '/:id/cancel' } as const;
/** Reason code stored when the customer cancels (no code is asked in the app). */
export const CUSTOMER_CANCEL_REASON_CODE = 'CUSTOMER_REQUEST';
