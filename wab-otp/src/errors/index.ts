import { ERROR_CODES, type ErrorCode } from '../constants/codes';

export interface OtpErrorOptions {
  readonly retryable?: boolean;
  readonly cause?: unknown;
  /** Never put secrets, tokens, codes or full phone numbers here. */
  readonly details?: Readonly<Record<string, unknown>>;
}

export class OtpError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, message: string, options: OtpErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'OtpError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};
  }
}

export const isOtpError = (error: unknown): error is OtpError => error instanceof OtpError;

export const configError = (message: string, details?: Record<string, unknown>): OtpError =>
  new OtpError(ERROR_CODES.CONFIG_INVALID, message, details ? { details } : {});

export const validationError = (message: string): OtpError =>
  new OtpError(ERROR_CODES.VALIDATION_FAILED, message);

/** The provider (Firebase, an SMS vendor) is down, slow or answered nonsense. */
export const providerError = (
  code: ErrorCode,
  message: string,
  retryable: boolean,
  cause?: unknown,
): OtpError =>
  new OtpError(code, message, { retryable, ...(cause === undefined ? {} : { cause }) });
