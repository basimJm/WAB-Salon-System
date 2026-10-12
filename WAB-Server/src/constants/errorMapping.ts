/** Names/codes used to recognise library errors without importing the libraries (SRV-004a). */
export const MONGOOSE_CAST_ERROR_NAME = 'CastError';
export const MONGOOSE_VALIDATION_ERROR_NAME = 'ValidationError';
export const MONGO_DUPLICATE_KEY_CODE = 11000;

export const JWT_ERROR_NAMES: ReadonlySet<string> = new Set([
  'TokenExpiredError',
  'JsonWebTokenError',
  'NotBeforeError',
]);

/** `type` values set by body-parser on its errors. */
export const BODY_PARSER_ERROR_TYPES = {
  parseFailed: 'entity.parse.failed',
  tooLarge: 'entity.too.large',
} as const;

export const NETWORK_ERROR_CODES: ReadonlySet<string> = new Set([
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
]);

export const TIMEOUT_ERROR_NAMES: ReadonlySet<string> = new Set(['TimeoutError', 'AbortError']);

/** Detail code used when a library error gives no more specific reason. */
export const DETAIL_CODE_INVALID = 'INVALID';

/** Max time to wait for graceful shutdown before forcing exit. */
export const SHUTDOWN_TIMEOUT_MS = 10_000;
export const EXIT_CODE_OK = 0;
export const EXIT_CODE_FAILURE = 1;
