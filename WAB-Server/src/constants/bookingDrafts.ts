/** Booking drafts (SRV-070, BUSINESS_DOMAIN.md §3.5 `bookingDrafts`, §5.6 step 1, Customer PRD S16). */
export const BOOKING_DRAFTS_COLLECTION = 'bookingDrafts';
export const BOOKING_DRAFT_ROUTES = { base: '/bookings/drafts', byId: '/:id' } as const;
export const BOOKING_PERSON_NAME_MAX_LENGTH = 50;
export const BOOKING_PERSON_NAME_MIN_LENGTH = 1;
/** A draft lock covers one salon-local date; creating a draft takes the lock of every date it touches. */
export const DRAFT_LOCK_SEGMENT = 'draft';
export const DRAFT_LOCK_TTL_MS = 10_000;
/** Per-IP limit for the draft routes (a customer re-prices while changing persons and slots). */
export const BOOKING_DRAFT_RATE_LIMIT = { windowMs: 60_000, max: 120 } as const;
