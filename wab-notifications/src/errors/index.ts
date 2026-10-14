import { ERROR_CODES, type ErrorCode } from '../constants/codes';

export interface NotificationErrorOptions {
  readonly retryable?: boolean;
  readonly cause?: unknown;
  /** Never put secrets, tokens or full addresses here. */
  readonly details?: Readonly<Record<string, unknown>>;
}

export class NotificationError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, message: string, options: NotificationErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'NotificationError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};
  }
}

export const isNotificationError = (error: unknown): error is NotificationError =>
  error instanceof NotificationError;

export const configError = (
  message: string,
  details?: Record<string, unknown>,
): NotificationError =>
  new NotificationError(ERROR_CODES.CONFIG_INVALID, message, details ? { details } : {});

export const validationError = (message: string): NotificationError =>
  new NotificationError(ERROR_CODES.VALIDATION_FAILED, message);
