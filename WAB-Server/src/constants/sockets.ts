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
} as const;
export const SOCKET_EVENTS = { connection: 'connection' } as const;
export const SOCKET_ROOMS = {
  customer: (id: string): string => `customer:${id}`,
  member: (id: string): string => `member:${id}`,
  admin: 'admin',
} as const;
/** Redis channel prefix of the Socket.IO adapter (keeps its pub/sub apart from other keys). */
export const SOCKET_ADAPTER_KEY = 'socket.io';
export const SOCKET_PING_INTERVAL_MS = 25_000;
export const SOCKET_PING_TIMEOUT_MS = 20_000;
export const SOCKET_MAX_PAYLOAD_BYTES = 100_000;
