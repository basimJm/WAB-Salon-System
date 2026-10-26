import {
  readMetaError,
  whatsAppStatusError,
  whatsAppTransportError,
} from '../src/adapters/whatsapp/errors';
import { OtpError } from '../src/errors';

describe('readMetaError', () => {
  it('reads code, subcode, type and trace id', () => {
    expect(
      readMetaError({
        error: { code: 131026, error_subcode: 2494010, type: 'OAuthException', fbtrace_id: 't' },
      }),
    ).toEqual({ code: 131026, subcode: 2494010, type: 'OAuthException', fbtraceId: 't' });
  });

  it('ignores anything that is not a Graph error object', () => {
    expect(readMetaError(null)).toEqual({});
    expect(readMetaError('x')).toEqual({});
    expect(readMetaError({})).toEqual({});
    expect(readMetaError({ error: 'x' })).toEqual({});
    expect(readMetaError({ error: { code: '131026', error_subcode: 1.5, type: 3 } })).toEqual({});
  });
});

describe('whatsAppStatusError (Meta error code first, HTTP status second)', () => {
  it.each([
    // not on WhatsApp / undeliverable / own number / not in the test allowed list
    [400, 131026, 'OTP_DELIVERY_FAILED', false],
    [400, 131021, 'OTP_DELIVERY_FAILED', false],
    [400, 131030, 'OTP_DELIVERY_FAILED', false],
    // token and permissions
    [401, 190, 'OTP_AUTH_FAILED', false],
    [401, 0, 'OTP_AUTH_FAILED', false],
    [403, 10, 'OTP_AUTH_FAILED', false],
    [403, 3, 'OTP_AUTH_FAILED', false],
    [403, 200, 'OTP_AUTH_FAILED', false],
    [403, 299, 'OTP_AUTH_FAILED', false],
    [403, 131005, 'OTP_AUTH_FAILED', false],
    // our request / template
    [400, 100, 'OTP_CONFIG_INVALID', false],
    [400, 131008, 'OTP_CONFIG_INVALID', false],
    [400, 131009, 'OTP_CONFIG_INVALID', false],
    [400, 132000, 'OTP_CONFIG_INVALID', false],
    [404, 132001, 'OTP_CONFIG_INVALID', false],
    [400, 132012, 'OTP_CONFIG_INVALID', false],
    [400, 132015, 'OTP_CONFIG_INVALID', false],
    [400, 132016, 'OTP_CONFIG_INVALID', false],
    [400, 135000, 'OTP_CONFIG_INVALID', false],
    // the account / number cannot send
    [403, 368, 'OTP_PROVIDER_UNAVAILABLE', false],
    [400, 131031, 'OTP_PROVIDER_UNAVAILABLE', false],
    [400, 131042, 'OTP_PROVIDER_UNAVAILABLE', false],
    [400, 133010, 'OTP_PROVIDER_UNAVAILABLE', false],
    // throttling
    [400, 4, 'OTP_RATE_LIMITED', true],
    [400, 80007, 'OTP_RATE_LIMITED', true],
    [400, 130429, 'OTP_RATE_LIMITED', true],
    [400, 131056, 'OTP_RATE_LIMITED', true],
    [400, 131048, 'OTP_RATE_LIMITED', false],
    // temporary
    [500, 1, 'OTP_PROVIDER_UNAVAILABLE', true],
    [500, 2, 'OTP_PROVIDER_UNAVAILABLE', true],
    [500, 131000, 'OTP_PROVIDER_UNAVAILABLE', true],
    [503, 131016, 'OTP_PROVIDER_UNAVAILABLE', true],
    [400, 131057, 'OTP_PROVIDER_UNAVAILABLE', true],
    [503, 133004, 'OTP_PROVIDER_UNAVAILABLE', true],
  ] as const)('HTTP %d + Meta %d -> %s (retryable %s)', (status, metaCode, code, retryable) => {
    const error = whatsAppStatusError(status, { code: metaCode, fbtraceId: 'trace' });
    expect(error).toBeInstanceOf(OtpError);
    expect(error).toMatchObject({ code, retryable });
    expect(error.details).toEqual({ status, metaCode, fbtraceId: 'trace' });
  });

  it.each([
    [401, 'OTP_AUTH_FAILED', false],
    [403, 'OTP_AUTH_FAILED', false],
    [429, 'OTP_RATE_LIMITED', true],
    [500, 'OTP_PROVIDER_UNAVAILABLE', true],
    [502, 'OTP_PROVIDER_UNAVAILABLE', true],
    [400, 'OTP_UNKNOWN', false],
    [404, 'OTP_UNKNOWN', false],
    [302, 'OTP_UNKNOWN', false],
  ] as const)('HTTP %d without a known Meta code -> %s', (status, code, retryable) => {
    expect(whatsAppStatusError(status, { code: 987654 })).toMatchObject({ code, retryable });
    expect(whatsAppStatusError(status, {})).toMatchObject({ code, retryable });
  });

  it('keeps the subcode in the details', () => {
    expect(whatsAppStatusError(400, { code: 131026, subcode: 7 }).details).toEqual({
      status: 400,
      metaCode: 131026,
      metaSubcode: 7,
    });
  });
});

describe('whatsAppTransportError', () => {
  it('maps timeouts and aborts to OTP_TIMEOUT, anything else to OTP_NETWORK_ERROR', () => {
    for (const name of ['TimeoutError', 'AbortError'])
      expect(whatsAppTransportError(Object.assign(new Error('x'), { name }))).toMatchObject({
        code: 'OTP_TIMEOUT',
        retryable: true,
      });
    expect(whatsAppTransportError(new TypeError('fetch failed'))).toMatchObject({
      code: 'OTP_NETWORK_ERROR',
      retryable: true,
    });
    expect(whatsAppTransportError('weird')).toMatchObject({ code: 'OTP_NETWORK_ERROR' });
  });

  it('passes typed errors through', () => {
    const typed = new OtpError('OTP_UNKNOWN', 'x');
    expect(whatsAppTransportError(typed)).toBe(typed);
  });
});
