/** Admin global search (SRV-118, Admin PRD §3). */
export const ADMIN_SEARCH_ROUTES = { base: '/search' } as const;
export const ADMIN_SEARCH_MIN_LENGTH = 2;
export const ADMIN_SEARCH_MAX_LENGTH = 100;
/** Groups of results a search can return; the response has one entry per requested group. */
export const ADMIN_SEARCH_TYPES = ['customers', 'salons', 'bookings', 'members'] as const;
export type AdminSearchType = (typeof ADMIN_SEARCH_TYPES)[number];
/** Rows per group when the client does not say (a topbar dropdown shows few). */
export const ADMIN_SEARCH_PAGE_SIZE = 5;
