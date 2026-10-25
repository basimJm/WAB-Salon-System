/** Realtime contract with the server (`WAB-Server/src/constants/sockets.ts`, BUSINESS_DOMAIN §7). */
export const REALTIME_NAMESPACE = '/admin';
export const REALTIME_AUTH_FIELD = 'token';
export const REALTIME_SOCKET_PATH = '/socket.io';

/**
 * Connect errors the server's namespace middleware sends in the handshake (`SOCKET_ERRORS`): no/expired token,
 * a token of another scope, and a transient rooms lookup failure. Socket.IO does not retry a middleware refusal.
 */
export const REALTIME_CONNECT_ERRORS = {
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  unavailable: 'UNAVAILABLE',
} as const;

/**
 * Events of the admin room, all emitted by the server (`SOCKET_EVENTS.bookingUpdated`, `ALERT_SOCKET_EVENT`,
 * `ADMIN_SOCKET_EVENTS`; verified against a real server with `qa/socket-check.mjs`, ADM-079).
 */
export const REALTIME_EVENTS = [
  'booking.updated',
  'alert.created',
  'application.created',
  'review.created',
  'refund.updated',
  'overview.tick',
] as const;
export type RealtimeEvent = (typeof REALTIME_EVENTS)[number];

/** Reconnect with exponential backoff (base * 2^attempt, capped) and jitter. */
export const REALTIME_RECONNECT = {
  baseMs: 1_000,
  maxMs: 30_000,
  randomization: 0.4,
} as const;

/**
 * Which cached queries an event makes stale: the first element of a query key is the operation id
 * (`data/api/queryKeys.ts`), so `['getBookings']` invalidates every booking list and detail.
 */
export const REALTIME_INVALIDATIONS: Record<RealtimeEvent, readonly (readonly string[])[]> = {
  'booking.updated': [['getBookings'], ['getBookingsById'], ['getAnalyticsOverview']],
  'alert.created': [['getAlerts'], ['getAlertsCount']],
  'application.created': [['getSalonsApplications']],
  'review.created': [['getReviews']],
  'refund.updated': [['getRefunds'], ['getRefundsById']],
  'overview.tick': [['getAnalyticsOverview']],
};
