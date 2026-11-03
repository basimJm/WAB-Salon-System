/** Home aggregate (SRV-061, Customer PRD S03). */
export const HOME_ROUTES = { base: '/home' } as const;
/** Each home section shows this many items; a "see more/all" link appears when there are more. */
export const HOME_SECTION_SIZE = 10;
/** Catalog services read to order the *Explore* section by popularity (§5.22). */
export const HOME_EXPLORE_CANDIDATES = 50;
/** Bookings of this many past days count for the *Explore* order. */
export const HOME_POPULARITY_DAYS = 90;
/** The *Explore* order is recomputed at most this often (one aggregate, shared by every request). */
export const HOME_POPULARITY_CACHE_MS = 10 * 60 * 1_000;
/** Bookings that count as a visit for *Book again*. */
export const HOME_BOOK_AGAIN_STATUSES = ['COMPLETED'] as const;
/** Newest completed bookings read to find the *Book again* businesses. */
export const HOME_BOOK_AGAIN_SCAN = 50;
