import { httpStatusError, httpTransportError } from '../src/adapters/email/httpErrors';
import { ERROR_CODES } from '../src/constants/codes';
import { NotificationError } from '../src/errors';

describe('email API status mapping', () => {
  it.each([
    [401, ERROR_CODES.AUTH_FAILED, false],
    [403, ERROR_CODES.AUTH_FAILED, false],
    [402, ERROR_CODES.QUOTA_EXCEEDED, false],
    [429, ERROR_CODES.RATE_LIMITED, true],
    [400, ERROR_CODES.PAYLOAD_INVALID, false],
    [500, ERROR_CODES.VENDOR_ERROR, true],
    [503, ERROR_CODES.VENDOR_ERROR, true],
    [404, ERROR_CODES.UNKNOWN, false],
    [302, ERROR_CODES.UNKNOWN, false],
  ])('status %i → %s (retryable %s)', (status, code, retryable) => {
    const error = httpStatusError(status, 'some_code');
    expect(error).toMatchObject({ code, retryable });
    expect(error.details).toEqual({ status, vendorCode: 'some_code' });
  });

  it('timeouts and network failures are retryable; typed errors pass through', () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    expect(httpTransportError(abort)).toMatchObject({ code: ERROR_CODES.TIMEOUT, retryable: true });
    expect(httpTransportError(timeout)).toMatchObject({ code: ERROR_CODES.TIMEOUT });
    expect(httpTransportError(new TypeError('fetch failed'))).toMatchObject({
      code: ERROR_CODES.NETWORK_ERROR,
      retryable: true,
    });
    expect(httpTransportError('not an error')).toMatchObject({ code: ERROR_CODES.NETWORK_ERROR });
    const typed = new NotificationError(ERROR_CODES.AUTH_FAILED, 'x');
    expect(httpTransportError(typed)).toBe(typed);
  });
});
