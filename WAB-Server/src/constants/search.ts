/** Salon search for customers (SRV-057, Customer PRD S04-S05). */
export const SEARCH_ROUTES = {
  base: '/salons',
  filters: '/filters',
  suggestions: '/suggestions',
} as const;
export const SEARCH_GENERAL_FILTERS = ['RECOMMENDED'] as const;
export type SearchGeneralFilter = (typeof SEARCH_GENERAL_FILTERS)[number];
export const SEARCH_MAX_SERVICE_FILTERS = 20;
/** Services and places shown while the customer types (§5.22), each. */
export const SEARCH_SUGGESTION_LIMIT = 5;
/** Business types in one lens query (`businessType=SALON,TATTOO`). */
export const SEARCH_MAX_BUSINESS_TYPES = 10;
export const SEARCH_TEXT_MAX_LENGTH = 80;
export const SEARCH_RATING_MIN = 1;
export const SEARCH_RATING_MAX = 5;
/** Length of the short description on a salon card. */
export const SHORT_DESCRIPTION_LENGTH = 120;
/** Per-IP limit for the search routes (typing and filtering fire many requests). */
/** Also the budget of every other browsing route (`browse` family, SRV-151). */
export const SEARCH_ROUTE_RATE_LIMIT = { windowMs: 60_000, max: 300 } as const;
export const SEARCH_SORTS = ['RATING', 'NEAREST'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];
export const EARTH_RADIUS_KM = 6371;
export const LATITUDE_LIMIT = 90;
export const LONGITUDE_LIMIT = 180;
/** Distances are shown to one decimal place (km). */
export const DISTANCE_DECIMALS = 10;
