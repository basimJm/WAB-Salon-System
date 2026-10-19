import { isNotFound, mapS3Error } from '../src/adapters/s3/errors';
import { ERROR_CODES, type ErrorCode } from '../src/constants/codes';
import { StorageError } from '../src/errors';

const failure = (name: string, status?: number, code?: string): unknown =>
  Object.assign(new Error(name), {
    name,
    ...(code ? { code } : {}),
    ...(status === undefined ? {} : { $metadata: { httpStatusCode: status, requestId: 'req-1' } }),
  });

describe('mapS3Error', () => {
  const table: [string, unknown, ErrorCode, boolean][] = [
    ['InvalidAccessKeyId', failure('InvalidAccessKeyId', 403), ERROR_CODES.AUTH_FAILED, false],
    [
      'SignatureDoesNotMatch',
      failure('SignatureDoesNotMatch', 403),
      ERROR_CODES.AUTH_FAILED,
      false,
    ],
    ['ExpiredToken', failure('ExpiredToken', 400), ERROR_CODES.AUTH_FAILED, false],
    [
      'CredentialsProviderError',
      failure('CredentialsProviderError'),
      ERROR_CODES.AUTH_FAILED,
      false,
    ],
    ['401', failure('Whatever', 401), ERROR_CODES.AUTH_FAILED, false],
    ['AccessDenied', failure('AccessDenied', 403), ERROR_CODES.ACCESS_DENIED, false],
    ['plain 403', failure('Other', 403), ERROR_CODES.ACCESS_DENIED, false],
    ['SlowDown', failure('SlowDown', 503), ERROR_CODES.RATE_LIMITED, true],
    ['429', failure('X', 429), ERROR_CODES.RATE_LIMITED, true],
    ['RequestTimeout', failure('RequestTimeout', 400), ERROR_CODES.TIMEOUT, true],
    ['AbortError', failure('AbortError'), ERROR_CODES.TIMEOUT, true],
    ['TimeoutError', failure('TimeoutError'), ERROR_CODES.TIMEOUT, true],
    ['ETIMEDOUT', failure('Error', undefined, 'ETIMEDOUT'), ERROR_CODES.TIMEOUT, true],
    ['408', failure('X', 408), ERROR_CODES.TIMEOUT, true],
    ['504', failure('X', 504), ERROR_CODES.TIMEOUT, true],
    ['ECONNRESET', failure('Error', undefined, 'ECONNRESET'), ERROR_CODES.NETWORK_ERROR, true],
    ['ECONNREFUSED', failure('Error', undefined, 'ECONNREFUSED'), ERROR_CODES.NETWORK_ERROR, true],
    ['ENOTFOUND', failure('Error', undefined, 'ENOTFOUND'), ERROR_CODES.NETWORK_ERROR, true],
    [
      'wrapped ECONNREFUSED',
      new Error('AWS SDK error wrapper for Error: connect ECONNREFUSED 127.0.0.1:1'),
      ERROR_CODES.NETWORK_ERROR,
      true,
    ],
    ['wrapped ETIMEDOUT', new Error('connect ETIMEDOUT 10.0.0.1:443'), ERROR_CODES.TIMEOUT, true],
    ['socket hang up', new Error('socket hang up'), ERROR_CODES.NETWORK_ERROR, true],
    ['NetworkingError', failure('NetworkingError'), ERROR_CODES.NETWORK_ERROR, true],
    ['NoSuchBucket', failure('NoSuchBucket', 404), ERROR_CODES.CONFIG_INVALID, false],
    ['PermanentRedirect', failure('PermanentRedirect', 301), ERROR_CODES.CONFIG_INVALID, false],
    ['InvalidArgument', failure('InvalidArgument', 400), ERROR_CODES.VALIDATION_FAILED, false],
    ['400', failure('X', 400), ERROR_CODES.VALIDATION_FAILED, false],
    ['413', failure('X', 413), ERROR_CODES.VALIDATION_FAILED, false],
    ['InternalError', failure('InternalError', 500), ERROR_CODES.UNAVAILABLE, true],
    ['ServiceUnavailable', failure('ServiceUnavailable', 503), ERROR_CODES.UNAVAILABLE, true],
    ['502', failure('X', 502), ERROR_CODES.UNAVAILABLE, true],
    ['409 conflict', failure('OperationAborted', 409), ERROR_CODES.VENDOR_ERROR, false],
    ['404 other', failure('Weird', 404), ERROR_CODES.VENDOR_ERROR, false],
    ['unknown', failure('Strange'), ERROR_CODES.UNKNOWN, false],
    ['not an object', 'boom', ERROR_CODES.UNKNOWN, false],
    ['null', null, ERROR_CODES.UNKNOWN, false],
  ];
  it.each(table)('maps %s', (_label, error, code, retryable) => {
    const mapped = mapS3Error(error);
    expect(mapped).toBeInstanceOf(StorageError);
    expect(mapped).toMatchObject({ code, retryable });
    expect(mapped.cause).toBe(error);
  });
  it('keeps vendor name, status and request id without secrets', () => {
    const mapped = mapS3Error(failure('SlowDown', 503));
    expect(mapped.details).toEqual({ vendorName: 'SlowDown', status: 503, requestId: 'req-1' });
    expect(mapS3Error(failure('Strange')).details).toEqual({ vendorName: 'Strange' });
  });
  it('uses the vendor Code field when name is absent', () => {
    expect(mapS3Error({ Code: 'SlowDown' }).code).toBe(ERROR_CODES.RATE_LIMITED);
  });
  it('passes typed errors through untouched', () => {
    const typed = new StorageError(ERROR_CODES.KEY_INVALID, 'k');
    expect(mapS3Error(typed)).toBe(typed);
  });
});

describe('isNotFound', () => {
  it.each([
    [failure('NotFound', 404), true],
    [failure('NoSuchKey', 404), true],
    [failure('X', 404), true],
    [failure('NoSuchBucket', 404), false],
    [failure('AccessDenied', 403), false],
    ['nope', false],
  ])('classifies %#', (error, expected) => {
    expect(isNotFound(error)).toBe(expected);
  });
});
