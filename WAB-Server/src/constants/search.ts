/** Salon search for customers (SRV-057, Customer PRD S04-S05). */
export const SEARCH_ROUTES = { base: '/salons', filters: '/filters' } as const;
export const SEARCH_GENERAL_FILTERS = ['RECOMMENDED'] as const;
export type SearchGeneralFilter = (typeof SEARCH_GENERAL_FILTERS)[number];
export const SEARCH_MAX_SERVICE_FILTERS = 20;
export const SEARCH_TEXT_MAX_LENGTH = 80;
export const SEARCH_RATING_MIN = 1;
export const SEARCH_RATING_MAX = 5;
/** Length of the short description on a salon card. */
export const SHORT_DESCRIPTION_LENGTH = 120;
/** Per-IP limit for the search routes (typing and filtering fire many requests). */
export const SEARCH_ROUTE_RATE_LIMIT = { windowMs: 60_000, max: 300 } as const;
