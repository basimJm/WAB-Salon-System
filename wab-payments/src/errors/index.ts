import { ERROR_CODES, type ErrorCode } from '../constants/codes';

export interface PaymentSdkErrorOptions {
  readonly retryable?: boolean;
  readonly cause?: unknown;
  /** Never put secrets, tokens or card data here. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/** The only error type the SDK throws (Integration.md §6). */
export class PaymentSdkError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, message: string, options: PaymentSdkErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'PaymentSdkError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};
  }
}

export const isPaymentSdkError = (error: unknown): error is PaymentSdkError =>
  error instanceof PaymentSdkError;

export const configError = (message: string, details?: Record<string, unknown>): PaymentSdkError =>
  new PaymentSdkError(ERROR_CODES.CONFIG_INVALID, message, details ? { details } : {});

export const validationError = (message: string): PaymentSdkError =>
  new PaymentSdkError(ERROR_CODES.VALIDATION_FAILED, message);
