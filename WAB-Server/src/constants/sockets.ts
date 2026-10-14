import type { TokenScope } from './auth';

/** Real-time layer (SRV-080, BUSINESS_DOMAIN.md §7): one Socket.IO namespace per token scope. */
export const SOCKET_PATH = '/socket.io';
export const SOCKET_NAMESPACES: Record<TokenScope, string> = {
  customer: '/customer',
  merchant: '/merchant',
  admin: '/admin',
};
/** Where a client puts its access token: `io(url + ns, { auth: { token } })`. */
export const SOCKET_AUTH_FIELD = 'token';
export const SOCKET_ERRORS = {
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  unavailable: 'UNAVAILABLE',
} as const;
export const SOCKET_EVENTS = {
  connection: 'connection',
  bookingRequested: 'booking.requested',
  bookingUpdated: 'booking.updated',
  bookingAssigned: 'booking.assigned',
} as const;
export const SOCKET_ROOMS = {
  customer: (id: string): string => `customer:${id}`,
  member: (id: string): string => `member:${id}`,
  /** Members who may answer booking requests (BOOKINGS_RESPOND). */
  salonRespond: (salonId: string): string => `salon:${salonId}:respond`,
  /** Members who see every booking of the salon (BOOKINGS_VIEW_ALL). */
  salonAll: (salonId: string): string => `salon:${salonId}:all`,
  admin: 'admin',
} as const;
/** Redis channel prefix of the Socket.IO adapter (keeps its pub/sub apart from other keys). */
export const SOCKET_ADAPTER_KEY = 'socket.io';
export const SOCKET_PING_INTERVAL_MS = 25_000;
export const SOCKET_PING_TIMEOUT_MS = 20_000;
export const SOCKET_MAX_PAYLOAD_BYTES = 100_000;

/** Account events (SRV-082, BUSINESS_DOMAIN.md §7). */
export const ACCOUNT_SOCKET_EVENTS = {
  permissionsUpdated: 'permissions.updated',
  accessRevoked: 'access.revoked',
  notificationsUnread: 'notifications.unread',
} as const;
/** Gives the `access.revoked` message time to reach the client before its connection is closed. */
export const ACCESS_REVOKED_GRACE_MS = 250;
/** How long closing waits for the adapter's subscriber to finish connecting and subscribing. */
export const SOCKET_ADAPTER_READY_TIMEOUT_MS = 2_000;
