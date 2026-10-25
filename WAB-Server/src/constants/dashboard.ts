import type { SalonState } from './salon';

/** Merchant dashboard (SRV-130, Merchant PRD M07). */
export const MERCHANT_DASHBOARD_ROUTES = { base: '/dashboard' } as const;
/** Newest pending requests shown on the card. */
export const DASHBOARD_PENDING_COUNT = 5;
/** Bookings listed in today's timeline (and counted for today). */
export const DASHBOARD_TODAY_MAX = 50;
/** Quick stats cover the last 7 days, today included. */
export const DASHBOARD_STATS_DAYS = 7;
/** One member's dashboard is cached this long (pull-to-refresh within it is served from cache). */
export const DASHBOARD_CACHE_TTL_SEC = 15;
export const DASHBOARD_CACHE_PREFIX = 'dashboard';
/** Salons that have a subscription (it is created on approval). */
export const SUBSCRIBED_SALON_STATES: readonly SalonState[] = [
  'APPROVED_INCOMPLETE',
  'LIVE',
  'OFFLINE',
];
