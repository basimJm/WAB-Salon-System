import { ERROR_CODES, FCM_CODES } from '../../constants/codes';
import { NotificationError } from '../../errors';
import type { PushTokenResult } from '../../types';

const includes = (list: readonly string[], code: string): boolean => list.includes(code);

/** Reads `code` from a firebase-admin error, whichever level carries it. */
export const fcmCodeOf = (error: unknown): string => {
  if (typeof error !== 'object' || error === null) return '';
  const record = error as { code?: unknown; errorInfo?: { code?: unknown } };
  if (typeof record.errorInfo?.code === 'string') return record.errorInfo.code;
  return typeof record.code === 'string' ? record.code : '';
};

export type TokenOutcome =
  | { readonly kind: 'invalid' }
  | { readonly kind: 'retry' }
  | { readonly kind: 'payload' }
  | { readonly kind: 'auth'; readonly code: string }
  | { readonly kind: 'failed' };

/** Classifies a per-token FCM error code. Unknown codes are `failed` and must be logged by the caller. */
export const classifyTokenError = (code: string, message = ''): TokenOutcome => {
  if (includes(FCM_CODES.invalidToken, code)) return { kind: 'invalid' };
  // FCM answers a malformed token with `invalid-argument`; the message tells it from a bad payload.
  if (code === 'messaging/invalid-argument' && FCM_CODES.tokenMessagePattern.test(message)) {
    return { kind: 'invalid' };
  }
  if (includes(FCM_CODES.retryable, code) || includes(FCM_CODES.rateLimited, code)) {
    return { kind: 'retry' };
  }
  if (includes(FCM_CODES.payloadInvalid, code)) return { kind: 'payload' };
  if (includes(FCM_CODES.auth, code)) return { kind: 'auth', code };
  return { kind: 'failed' };
};

export const toTokenResult = (outcome: TokenOutcome): PushTokenResult =>
  outcome.kind === 'invalid' ? 'INVALID_TOKEN' : 'FAILED';

/** Turns a thrown FCM / network error into the SDK's typed error. */
export const normalizeFcmError = (error: unknown): NotificationError => {
  if (error instanceof NotificationError) return error;
  const code = fcmCodeOf(error);
  const cause = { cause: error, details: { vendorCode: code } } as const;
  if (includes(FCM_CODES.auth, code)) {
    return new NotificationError(ERROR_CODES.AUTH_FAILED, 'FCM rejected the credentials', cause);
  }
  if (includes(FCM_CODES.rateLimited, code)) {
    return new NotificationError(ERROR_CODES.RATE_LIMITED, 'FCM rate limit reached', {
      ...cause,
      retryable: true,
    });
  }
  if (includes(FCM_CODES.payloadInvalid, code)) {
    return new NotificationError(ERROR_CODES.PAYLOAD_INVALID, 'FCM rejected the payload', cause);
  }
  if (includes(FCM_CODES.retryable, code) || code === '') {
    // No code at all means the request never got an FCM answer (DNS, socket, TLS): transient.
    return new NotificationError(
      code === '' ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.VENDOR_ERROR,
      'FCM is unavailable',
      { ...cause, retryable: true },
    );
  }
  return new NotificationError(ERROR_CODES.UNKNOWN, 'unexpected FCM error', cause);
};
