import { ERROR_CODES, type ErrorCode } from '../constants/codes';

export interface StorageErrorOptions {
  readonly retryable?: boolean;
  readonly cause?: unknown;
  /** Never put secrets, credentials or signed URLs here. */
  readonly details?: Readonly<Record<string, unknown>>;
}

export class StorageError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, message: string, options: StorageErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'StorageError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};
  }
}

export const isStorageError = (error: unknown): error is StorageError =>
  error instanceof StorageError;

export const configError = (message: string, details?: Record<string, unknown>): StorageError =>
  new StorageError(ERROR_CODES.CONFIG_INVALID, message, details ? { details } : {});

export const validationError = (message: string): StorageError =>
  new StorageError(ERROR_CODES.VALIDATION_FAILED, message);
