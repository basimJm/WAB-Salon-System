import { ERROR_CODES, HTTP_EMAIL_STATUS, HTTP_TIMEOUT_ERROR_NAMES } from '../../constants/codes';
import { NotificationError } from '../../errors';

/** Turns an email API status into the SDK's typed error (only non-accepted statuses get here). */
export const httpStatusError = (status: number, vendorCode: string | null): NotificationError => {
  const details = { status, vendorCode } as const;
  if ((HTTP_EMAIL_STATUS.auth as readonly number[]).includes(status)) {
    return new NotificationError(ERROR_CODES.AUTH_FAILED, 'email API rejected the credentials', {
      details,
    });
  }
  if (status === HTTP_EMAIL_STATUS.quota) {
    return new NotificationError(ERROR_CODES.QUOTA_EXCEEDED, 'email API credits exhausted', {
      details,
    });
  }
  if (status === HTTP_EMAIL_STATUS.rateLimited) {
    return new NotificationError(ERROR_CODES.RATE_LIMITED, 'email API rate limit', {
      details,
      retryable: true,
    });
  }
  if (status === HTTP_EMAIL_STATUS.badRequest) {
    return new NotificationError(ERROR_CODES.PAYLOAD_INVALID, 'email API refused the message', {
      details,
    });
  }
  if (status >= HTTP_EMAIL_STATUS.serverErrorFrom) {
    return new NotificationError(ERROR_CODES.VENDOR_ERROR, 'email API temporary failure', {
      details,
      retryable: true,
    });
  }
  return new NotificationError(ERROR_CODES.UNKNOWN, 'unexpected email API status', { details });
};

/** Turns a fetch failure (no HTTP answer) into the SDK's typed error. */
export const httpTransportError = (error: unknown): NotificationError => {
  if (error instanceof NotificationError) return error;
  const name = error instanceof Error ? error.name : '';
  if ((HTTP_TIMEOUT_ERROR_NAMES as readonly string[]).includes(name)) {
    return new NotificationError(ERROR_CODES.TIMEOUT, 'email API request timed out', {
      cause: error,
      retryable: true,
    });
  }
  return new NotificationError(ERROR_CODES.NETWORK_ERROR, 'email API unreachable', {
    cause: error,
    retryable: true,
  });
};
