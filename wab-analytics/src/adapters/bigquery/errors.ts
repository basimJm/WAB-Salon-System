import { ERROR_CODES, type ErrorCode } from '../../constants/codes';
import { NETWORK_ERROR_CODES } from '../../constants/defaults';
import { AnalyticsError, isAnalyticsError } from '../../errors';

/** HTTP statuses the mapping distinguishes. */
const HTTP = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  requestTimeout: 408,
  tooManyRequests: 429,
  serverError: 500,
} as const;

/** BigQuery `errors[].reason` values and the code each maps to. */
const REASONS: Readonly<Record<string, ErrorCode>> = {
  rateLimitExceeded: ERROR_CODES.RATE_LIMITED,
  userRateLimitExceeded: ERROR_CODES.RATE_LIMITED,
  quotaExceeded: ERROR_CODES.RATE_LIMITED,
  backendError: ERROR_CODES.ANALYTICS_UNAVAILABLE,
  internalError: ERROR_CODES.ANALYTICS_UNAVAILABLE,
  jobBackendError: ERROR_CODES.ANALYTICS_UNAVAILABLE,
  bytesBilledLimitExceeded: ERROR_CODES.ANALYTICS_QUERY_TOO_EXPENSIVE,
  notFound: ERROR_CODES.ANALYTICS_NOT_CONFIGURED,
  accessDenied: ERROR_CODES.AUTH_FAILED,
  forbidden: ERROR_CODES.AUTH_FAILED,
  unauthorized: ERROR_CODES.AUTH_FAILED,
  authError: ERROR_CODES.AUTH_FAILED,
  invalidCredentials: ERROR_CODES.AUTH_FAILED,
  timeout: ERROR_CODES.TIMEOUT,
  invalidQuery: ERROR_CODES.VENDOR_ERROR,
  invalid: ERROR_CODES.VENDOR_ERROR,
  badRequest: ERROR_CODES.VENDOR_ERROR,
};

const MESSAGES: Readonly<Partial<Record<ErrorCode, string>>> = {
  [ERROR_CODES.RATE_LIMITED]: 'the warehouse is rate limiting requests',
  [ERROR_CODES.ANALYTICS_UNAVAILABLE]: 'the warehouse is unavailable',
  [ERROR_CODES.ANALYTICS_QUERY_TOO_EXPENSIVE]: 'the query exceeds the allowed bytes billed',
  [ERROR_CODES.ANALYTICS_NOT_CONFIGURED]: 'the dataset or table was not found',
  [ERROR_CODES.AUTH_FAILED]: 'the warehouse rejected the credentials',
  [ERROR_CODES.TIMEOUT]: 'the warehouse query timed out',
  [ERROR_CODES.NETWORK_ERROR]: 'the warehouse could not be reached',
  [ERROR_CODES.VENDOR_ERROR]: 'the warehouse rejected the query',
};

const field = (error: unknown, key: string): unknown =>
  typeof error === 'object' && error !== null ? (error as Record<string, unknown>)[key] : undefined;

const reasonOf = (error: unknown): string | undefined => {
  const errors = field(error, 'errors');
  if (!Array.isArray(errors)) return undefined;
  for (const entry of errors as unknown[]) {
    const reason = field(entry, 'reason');
    if (typeof reason === 'string' && reason in REASONS) return reason;
  }
  return undefined;
};

const byStatus = (status: number): ErrorCode => {
  if (status === HTTP.unauthorized || status === HTTP.forbidden) return ERROR_CODES.AUTH_FAILED;
  if (status === HTTP.notFound) return ERROR_CODES.ANALYTICS_NOT_CONFIGURED;
  if (status === HTTP.tooManyRequests) return ERROR_CODES.RATE_LIMITED;
  if (status === HTTP.requestTimeout) return ERROR_CODES.TIMEOUT;
  if (status >= HTTP.serverError) return ERROR_CODES.ANALYTICS_UNAVAILABLE;
  if (status >= HTTP.badRequest) return ERROR_CODES.VENDOR_ERROR;
  return ERROR_CODES.UNKNOWN;
};

/** Every BigQuery failure becomes a typed error; vendor text stays in `cause` only. */
export const mapBigQueryError = (error: unknown): AnalyticsError => {
  if (isAnalyticsError(error)) return error;
  const reason = reasonOf(error);
  const code = field(error, 'code');
  let mapped: ErrorCode = ERROR_CODES.UNKNOWN;
  if (reason !== undefined) mapped = REASONS[reason] ?? ERROR_CODES.UNKNOWN;
  else if (typeof code === 'string' && NETWORK_ERROR_CODES.includes(code)) {
    mapped = ERROR_CODES.NETWORK_ERROR;
  } else if (typeof code === 'number') mapped = byStatus(code);
  return new AnalyticsError(mapped, MESSAGES[mapped] ?? 'unexpected warehouse failure', {
    cause: error,
    ...(reason === undefined ? {} : { details: { reason } }),
  });
};
