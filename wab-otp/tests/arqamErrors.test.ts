import { arqamStatusError, readArqamError } from '../src/adapters/arqam/errors';
import { ARQAM_ERRORS } from '../src/constants/arqam';

const MAX_WAIT = 2000;

describe('readArqamError', () => {
  it('reads errorCode, errorMessage and retryAfter', () => {
    expect(
      readArqamError({
        success: false,
        errorCode: 'RATE_LIMITED',
        errorMessage: 'm',
        retryAfter: 1,
      }),
    ).toEqual({ errorCode: 'RATE_LIMITED', errorMessage: 'm', retryAfter: 1 });
  });

  it('drops missing or mistyped fields', () => {
    expect(readArqamError(null)).toEqual({});
    expect(readArqamError('x')).toEqual({});
    expect(readArqamError([])).toEqual({});
    expect(readArqamError({ errorCode: '', errorMessage: 3, retryAfter: -1 })).toEqual({});
    expect(readArqamError({ errorCode: 7, retryAfter: '5' })).toEqual({});
    expect(readArqamError({ retryAfter: Number.POSITIVE_INFINITY })).toEqual({});
  });
});

describe('arqamStatusError', () => {
  it.each([
    [400, 'INVALID_PHONE', 'OTP_DELIVERY_FAILED', false],
    [502, 'PROVIDER_ERROR', 'OTP_DELIVERY_FAILED', false],
    [401, 'UNAUTHORIZED', 'OTP_AUTH_FAILED', false],
    [400, 'UNKNOWN_AUTH_TEMPLATE', 'OTP_CONFIG_INVALID', false],
    [400, 'SENDER_REQUIRED', 'OTP_CONFIG_INVALID', false],
    [400, 'INVALID_REQUEST', 'OTP_CONFIG_INVALID', false],
    [402, 'INSUFFICIENT_CREDITS', 'OTP_PROVIDER_UNAVAILABLE', false],
    [403, 'SENDER_NOT_AVAILABLE', 'OTP_PROVIDER_UNAVAILABLE', false],
    [429, 'RATE_LIMIT_PHONE', 'OTP_RATE_LIMITED', false],
    [429, 'RATE_LIMIT_IP', 'OTP_RATE_LIMITED', false],
    [429, 'RATE_LIMITED', 'OTP_RATE_LIMITED', true],
  ] as const)('%i %s → %s (retryable %s)', (status, errorCode, code, retryable) => {
    const error = arqamStatusError(status, { errorCode }, MAX_WAIT);
    expect(error).toMatchObject({ code, retryable, details: { status, arqamError: errorCode } });
  });

  it('covers every documented ARQAM error code', () => {
    expect(Object.keys(ARQAM_ERRORS).sort()).toEqual(
      [
        'INSUFFICIENT_CREDITS',
        'INVALID_PHONE',
        'INVALID_REQUEST',
        'PROVIDER_ERROR',
        'RATE_LIMITED',
        'RATE_LIMIT_IP',
        'RATE_LIMIT_PHONE',
        'SENDER_NOT_AVAILABLE',
        'SENDER_REQUIRED',
        'UNAUTHORIZED',
        'UNKNOWN_AUTH_TEMPLATE',
      ].sort(),
    );
  });

  it.each([
    [401, 'OTP_AUTH_FAILED', false],
    [403, 'OTP_AUTH_FAILED', false],
    [402, 'OTP_PROVIDER_UNAVAILABLE', false],
    [429, 'OTP_RATE_LIMITED', true],
    [500, 'OTP_PROVIDER_UNAVAILABLE', true],
    [503, 'OTP_PROVIDER_UNAVAILABLE', true],
    [400, 'OTP_UNKNOWN', false],
    [404, 'OTP_UNKNOWN', false],
  ] as const)('falls back to the HTTP status %i → %s', (status, code, retryable) => {
    expect(arqamStatusError(status, {}, MAX_WAIT)).toMatchObject({ code, retryable });
    expect(arqamStatusError(status, { errorCode: 'NEW_THING' }, MAX_WAIT)).toMatchObject({
      code,
      details: { arqamError: 'NEW_THING' },
    });
  });

  it('keeps a short retryAfter as a retry hint and refuses to wait for a long one', () => {
    expect(arqamStatusError(429, { errorCode: 'RATE_LIMITED', retryAfter: 2 }, 2000)).toMatchObject(
      { retryable: true, details: { retryAfterMs: 2000 } },
    );
    expect(arqamStatusError(429, { errorCode: 'RATE_LIMITED', retryAfter: 3 }, 2000)).toMatchObject(
      { retryable: false, details: { retryAfterMs: 3000 } },
    );
    expect(arqamStatusError(429, { errorCode: 'RATE_LIMITED' }, 2000).details).not.toHaveProperty(
      'retryAfterMs',
    );
  });
});
