import { asRecord, isSuccess, parseJson, sendHttp, transportError } from '../src/adapters/http';
import { OtpError } from '../src/errors';

const request = {
  url: 'https://vendor.test/x',
  method: 'POST',
  headers: { a: 'b' },
  timeoutMs: 50,
  vendor: 'V',
} as const;

describe('http helpers', () => {
  it('parses JSON and returns null for anything else', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseJson('')).toBeNull();
    expect(parseJson('<html>')).toBeNull();
  });

  it('knows 2xx and plain objects', () => {
    expect(isSuccess(200)).toBe(true);
    expect(isSuccess(299)).toBe(true);
    expect(isSuccess(199)).toBe(false);
    expect(isSuccess(300)).toBe(false);
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord([1])).toBeNull();
    expect(asRecord(null)).toBeNull();
    expect(asRecord('x')).toBeNull();
  });

  it('maps timeouts and network failures to retryable errors and keeps OtpErrors', () => {
    const timeout = Object.assign(new Error('slow'), { name: 'TimeoutError' });
    const abort = Object.assign(new Error('stop'), { name: 'AbortError' });
    expect(transportError(timeout, 'V')).toMatchObject({ code: 'OTP_TIMEOUT', retryable: true });
    expect(transportError(abort, 'V')).toMatchObject({ code: 'OTP_TIMEOUT' });
    expect(transportError(new TypeError('fetch failed'), 'V')).toMatchObject({
      code: 'OTP_NETWORK_ERROR',
      retryable: true,
      message: 'V unreachable',
    });
    expect(transportError('weird', 'V')).toMatchObject({ code: 'OTP_NETWORK_ERROR' });
    const own = new OtpError('OTP_UNKNOWN', 'u');
    expect(transportError(own, 'V')).toBe(own);
  });

  it('sends with or without a body and returns status + parsed body', async () => {
    const seen: { body?: string; signal: AbortSignal }[] = [];
    const fetch = (
      _url: string,
      init: { body?: string; signal: AbortSignal },
    ): Promise<{ status: number; text: () => Promise<string> }> => {
      seen.push(init);
      return Promise.resolve({ status: 201, text: () => Promise.resolve('{"ok":true}') });
    };
    await expect(sendHttp(fetch, { ...request, body: '{}' })).resolves.toEqual({
      status: 201,
      body: { ok: true },
    });
    await sendHttp(fetch, request);
    expect(seen[0]?.body).toBe('{}');
    expect(seen[1] && 'body' in seen[1]).toBe(false);
    expect(seen[0]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts a request that exceeds the timeout', async () => {
    const hanging = (
      _url: string,
      init: { signal: AbortSignal },
    ): Promise<{ status: number; text: () => Promise<string> }> =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          reject(init.signal.reason as Error);
        });
      });
    await expect(sendHttp(hanging, { ...request, timeoutMs: 5 })).rejects.toMatchObject({
      code: 'OTP_TIMEOUT',
    });
  });
});
