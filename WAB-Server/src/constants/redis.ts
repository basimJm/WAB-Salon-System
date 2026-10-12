/** Redis client, key and lock constants (SRV-013). */
export const REDIS_CONNECT_TIMEOUT_MS = 5_000;
export const REDIS_COMMAND_TIMEOUT_MS = 5_000;
export const REDIS_MAX_RETRIES_PER_REQUEST = 3;
export const REDIS_RETRY_BASE_DELAY_MS = 100;
export const REDIS_RETRY_MAX_DELAY_MS = 3_000;
export const REDIS_READINESS_CHECK_NAME = 'redis';
export const REDIS_PING_REPLY = 'PONG';

/** Every key the server writes starts with one of these prefixes. */
export const REDIS_KEY_PREFIX = {
  lock: 'lock',
} as const;
export const REDIS_KEY_SEPARATOR = ':';

/** Distributed lock defaults. The booking engine passes its own TTL (BUSINESS_DOMAIN.md §5.6). */
export const LOCK_DEFAULT_TTL_MS = 10_000;
export const LOCK_DEFAULT_RETRY_ATTEMPTS = 20;
export const LOCK_DEFAULT_RETRY_DELAY_MS = 50;
export const LOCK_RETRY_JITTER_MS = 25;
