import { ERROR_CODES, RETRYABLE_CODES, type ErrorCode } from '../constants/codes';

export interface AnalyticsErrorOptions {
  readonly retryable?: boolean;
  readonly cause?: unknown;
  /** Never put secrets, credentials or personal data here. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Every failure of the package. `retryable` defaults from the code. */
export class AnalyticsError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, message: string, options: AnalyticsErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AnalyticsError';
    this.code = code;
    this.retryable = options.retryable ?? RETRYABLE_CODES.includes(code);
    this.details = options.details ?? {};
  }
}

export const isAnalyticsError = (error: unknown): error is AnalyticsError =>
  error instanceof AnalyticsError;

export const configError = (message: string, details?: Record<string, unknown>): AnalyticsError =>
  new AnalyticsError(ERROR_CODES.CONFIG_INVALID, message, details ? { details } : {});

export const validationError = (
  message: string,
  details?: Record<string, unknown>,
): AnalyticsError =>
  new AnalyticsError(ERROR_CODES.VALIDATION_FAILED, message, details ? { details } : {});

export const rangeError = (message: string, details?: Record<string, unknown>): AnalyticsError =>
  new AnalyticsError(ERROR_CODES.ANALYTICS_RANGE_INVALID, message, details ? { details } : {});

export const notConfiguredError = (
  message: string,
  options: AnalyticsErrorOptions = {},
): AnalyticsError => new AnalyticsError(ERROR_CODES.ANALYTICS_NOT_CONFIGURED, message, options);

export const unavailableError = (message: string, cause?: unknown): AnalyticsError =>
  new AnalyticsError(
    ERROR_CODES.ANALYTICS_UNAVAILABLE,
    message,
    cause === undefined ? {} : { cause },
  );

export const malformedError = (message: string, cause?: unknown): AnalyticsError =>
  new AnalyticsError(ERROR_CODES.MALFORMED_RESPONSE, message, cause === undefined ? {} : { cause });

/** Any thrown value becomes an `AnalyticsError` (unknown values map to `UNKNOWN`). */
export const toAnalyticsError = (error: unknown): AnalyticsError =>
  isAnalyticsError(error)
    ? error
    : new AnalyticsError(ERROR_CODES.UNKNOWN, 'unexpected analytics failure', { cause: error });
