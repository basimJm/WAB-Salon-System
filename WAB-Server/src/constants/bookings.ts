/** Bookings (SRV-071, BUSINESS_DOMAIN.md §3.5 `bookings`, §5.6). */
export const BOOKINGS_COLLECTION = 'bookings';
export const BOOKING_ROUTES = { base: '/bookings' } as const;
/** Lock segment for the per-staff, per-date creation lock (`lock:staff:<staffId>:<date>`). */
export const STAFF_LOCK_SEGMENT = 'staff';
export const STAFF_LOCK_TTL_MS = 10_000;
export const BOOKING_RATE_LIMIT = { windowMs: 60_000, max: 60 } as const;
