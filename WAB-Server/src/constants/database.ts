/** MongoDB connection and repository constants (SRV-012). */
export const MONGO_SERVER_SELECTION_TIMEOUT_MS = 5_000;
export const MONGO_CONNECT_TIMEOUT_MS = 10_000;
export const MONGO_SOCKET_TIMEOUT_MS = 45_000;
export const MONGO_MAX_POOL_SIZE = 20;
export const MONGO_MIN_POOL_SIZE = 2;

export const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
export const MONGO_READINESS_CHECK_NAME = 'mongodb';

export const SORT_ASCENDING = 1;
export const SORT_DESCENDING = -1;
export const DEFAULT_SORT = { createdAt: SORT_DESCENDING } as const;
