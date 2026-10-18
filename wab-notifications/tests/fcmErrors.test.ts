import { ERROR_CODES } from '../src/constants/codes';
import { NotificationError } from '../src/errors';
import {
  classifyTokenError,
  fcmCodeOf,
  normalizeFcmError,
  toTokenResult,
} from '../src/adapters/push/fcmErrors';

describe('fcmCodeOf', () => {
  it('reads errorInfo.code first, then code, else empty', () => {
    expect(fcmCodeOf({ errorInfo: { code: 'a/b' }, code: 'x' })).toBe('a/b');
    expect(fcmCodeOf({ code: 'x' })).toBe('x');
    expect(fcmCodeOf({ errorInfo: { code: 5 }, code: 7 })).toBe('');
    expect(fcmCodeOf(new Error('plain'))).toBe('');
    expect(fcmCodeOf(null)).toBe('');
    expect(fcmCodeOf('text')).toBe('');
  });
});

describe('classifyTokenError', () => {
  it.each([
    ['messaging/registration-token-not-registered', 'invalid'],
    ['messaging/invalid-registration-token', 'invalid'],
    ['messaging/internal-error', 'retry'],
    ['messaging/server-unavailable', 'retry'],
    ['messaging/message-rate-exceeded', 'retry'],
    ['messaging/quota-exceeded', 'retry'],
    ['messaging/invalid-argument', 'payload'],
    ['messaging/payload-size-limit-exceeded', 'payload'],
    ['messaging/authentication-error', 'auth'],
    ['app/invalid-credential', 'auth'],
    ['messaging/something-new', 'failed'],
    ['', 'failed'],
  ])('%s → %s', (code, kind) => {
    expect(classifyTokenError(code).kind).toBe(kind);
  });
  it('tells a malformed token from a bad payload by the message', () => {
    expect(
      classifyTokenError(
        'messaging/invalid-argument',
        'The registration token is not a valid FCM registration token',
      ).kind,
    ).toBe('invalid');
    expect(classifyTokenError('messaging/invalid-argument', 'Invalid JSON payload').kind).toBe(
      'payload',
    );
    expect(classifyTokenError('messaging/invalid-payload').kind).toBe('payload');
    expect(classifyTokenError('messaging/other', 'registration token').kind).toBe('failed');
  });
  it('carries the auth code', () => {
    expect(classifyTokenError('messaging/authentication-error')).toEqual({
      kind: 'auth',
      code: 'messaging/authentication-error',
    });
  });
});

describe('toTokenResult', () => {
  it('maps invalid to INVALID_TOKEN and everything else to FAILED', () => {
    expect(toTokenResult({ kind: 'invalid' })).toBe('INVALID_TOKEN');
    expect(toTokenResult({ kind: 'failed' })).toBe('FAILED');
    expect(toTokenResult({ kind: 'retry' })).toBe('FAILED');
    expect(toTokenResult({ kind: 'payload' })).toBe('FAILED');
  });
});

describe('normalizeFcmError', () => {
  const normalized = (code: string | undefined): NotificationError =>
    normalizeFcmError(
      code === undefined ? new Error('x') : Object.assign(new Error(code), { code }),
    );

  it('passes SDK errors through unchanged', () => {
    const own = new NotificationError(ERROR_CODES.TIMEOUT, 'slow', { retryable: true });
    expect(normalizeFcmError(own)).toBe(own);
  });
  it('maps credentials problems to a non-retryable AUTH_FAILED', () => {
    const error = normalized('messaging/authentication-error');
    expect(error).toMatchObject({ code: ERROR_CODES.AUTH_FAILED, retryable: false });
    expect(error.details).toEqual({ vendorCode: 'messaging/authentication-error' });
  });
  it('maps rate limits to a retryable RATE_LIMITED', () => {
    expect(normalized('messaging/message-rate-exceeded')).toMatchObject({
      code: ERROR_CODES.RATE_LIMITED,
      retryable: true,
    });
  });
  it('maps bad payloads to a non-retryable PAYLOAD_INVALID', () => {
    expect(normalized('messaging/invalid-argument')).toMatchObject({
      code: ERROR_CODES.PAYLOAD_INVALID,
      retryable: false,
    });
  });
  it('maps server trouble to a retryable VENDOR_ERROR', () => {
    expect(normalized('messaging/internal-error')).toMatchObject({
      code: ERROR_CODES.VENDOR_ERROR,
      retryable: true,
    });
  });
  it('treats a missing code (no answer from FCM) as a retryable NETWORK_ERROR', () => {
    expect(normalized(undefined)).toMatchObject({
      code: ERROR_CODES.NETWORK_ERROR,
      retryable: true,
    });
  });
  it('maps unknown codes to a non-retryable UNKNOWN and keeps the cause', () => {
    const cause = Object.assign(new Error('x'), { code: 'messaging/brand-new' });
    const error = normalizeFcmError(cause);
    expect(error).toMatchObject({ code: ERROR_CODES.UNKNOWN, retryable: false });
    expect(error.cause).toBe(cause);
  });
});
