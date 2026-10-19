import { createKeyProvider, keyTtlSec, statusError } from '../src/adapters/firebase/keys';
import { silentLogger } from '../src/logging';
import type { RetryDeps } from '../src/retry';
import { jwks, makeKey, NOW, stubFetch, type StubResponse } from './helpers/firebase';

const instant: RetryDeps = { sleep: () => Promise.resolve(), random: () => 0.5 };
const retry = { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2, jitterRatio: 0 };

describe('keyTtlSec / statusError', () => {
  it('honours max-age, bounds it below and falls back without a header', () => {
    expect(keyTtlSec('public, max-age=19000, must-revalidate')).toBe(19000);
    expect(keyTtlSec('max-age=5')).toBe(60);
    expect(keyTtlSec('no-store')).toBe(3600);
    expect(keyTtlSec(null)).toBe(3600);
  });
  it('maps every status class', () => {
    expect(statusError(429)).toMatchObject({ code: 'OTP_RATE_LIMITED', retryable: true });
    expect(statusError(401)).toMatchObject({ code: 'OTP_AUTH_FAILED', retryable: false });
    expect(statusError(403)).toMatchObject({ code: 'OTP_AUTH_FAILED', retryable: false });
    expect(statusError(408)).toMatchObject({ code: 'OTP_TIMEOUT', retryable: true });
    expect(statusError(503)).toMatchObject({ code: 'OTP_PROVIDER_UNAVAILABLE', retryable: true });
    expect(statusError(404)).toMatchObject({ code: 'OTP_PROVIDER_UNAVAILABLE', retryable: false });
    expect(statusError(302)).toMatchObject({ retryable: false });
  });
});

describe('createKeyProvider', () => {
  let time = NOW.getTime();
  beforeEach(() => {
    time = NOW.getTime();
  });
  const build = (
    respond: (call: number) => StubResponse | Error,
    over: { timeoutMs?: number } = {},
  ): { provider: ReturnType<typeof createKeyProvider>; calls: () => number } => {
    const stub = stubFetch(respond);
    return {
      calls: stub.calls,
      provider: createKeyProvider({
        url: 'https://keys.example/jwk',
        fetch: stub.fetch,
        timeoutMs: over.timeoutMs ?? 1000,
        retry,
        retryDeps: instant,
        now: () => new Date(time),
        logger: silentLogger,
      }),
    };
  };

  it('downloads once, caches within max-age and serves concurrent callers from one fetch', async () => {
    const key = await makeKey();
    const { provider, calls } = build(() => ({ body: jwks(key) }));
    const [a, b] = await Promise.all([provider.getKey(key.kid), provider.getKey(key.kid)]);
    expect(a).toBeDefined();
    expect(a).toBe(b);
    await provider.getKey(key.kid);
    expect(calls()).toBe(1);
    time += 3601 * 1000;
    await provider.getKey(key.kid);
    expect(calls()).toBe(2);
  });

  it('re-fetches on an unknown kid after the minimum interval (rotation) but not before', async () => {
    const old = await makeKey('old');
    const fresh = await makeKey('new');
    const { provider, calls } = build((call) => ({
      body: call === 1 ? jwks(old) : jwks(old, fresh),
    }));
    expect(await provider.getKey('old')).not.toBeNull();
    expect(await provider.getKey('new')).toBeNull();
    expect(calls()).toBe(1);
    time += 61 * 1000;
    expect(await provider.getKey('new')).not.toBeNull();
    expect(calls()).toBe(2);
    expect(await provider.getKey('nobody')).toBeNull();
  });

  it('retries transient failures then succeeds', async () => {
    const key = await makeKey();
    const { provider, calls } = build((call) =>
      call === 1 ? new Error('ECONNRESET') : call === 2 ? { status: 503 } : { body: jwks(key) },
    );
    expect(await provider.getKey(key.kid)).not.toBeNull();
    expect(calls()).toBe(3);
  });

  it('wraps network errors, statuses, timeouts and bad bodies as typed errors', async () => {
    const down = new Error('socket hang up secret-host');
    await expect(build(() => down).provider.getKey('k')).rejects.toMatchObject({
      code: 'OTP_NETWORK_ERROR',
      retryable: true,
      cause: down,
    });
    await expect(build(() => ({ status: 500 })).provider.getKey('k')).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
      retryable: true,
    });
    const forbidden = build(() => ({ status: 403 }));
    await expect(forbidden.provider.getKey('k')).rejects.toMatchObject({ code: 'OTP_AUTH_FAILED' });
    expect(forbidden.calls()).toBe(1);
    for (const body of [null, {}, { keys: [] }, { keys: [{ kid: 'a' }] }, { keys: 'x' }]) {
      await expect(build(() => ({ body })).provider.getKey('k')).rejects.toMatchObject({
        code: 'OTP_MALFORMED_RESPONSE',
      });
    }
    await expect(
      build(() => ({ json: () => Promise.reject(new Error('bad json')) })).provider.getKey('k'),
    ).rejects.toMatchObject({ code: 'OTP_MALFORMED_RESPONSE' });
  });

  it('times out a hanging endpoint', async () => {
    const provider = createKeyProvider({
      url: 'https://keys.example/jwk',
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        }),
      timeoutMs: 10,
      retry: { ...retry, maxAttempts: 1 },
      retryDeps: instant,
      now: () => new Date(time),
      logger: silentLogger,
    });
    await expect(provider.getKey('k')).rejects.toMatchObject({
      code: 'OTP_TIMEOUT',
      retryable: true,
    });
  });

  it('serves stale keys when the endpoint fails, for a bounded time only', async () => {
    const key = await makeKey();
    const warn = jest.fn();
    const stub = stubFetch((call) => (call === 1 ? { body: jwks(key) } : { status: 500 }));
    const provider = createKeyProvider({
      url: 'https://keys.example/jwk',
      fetch: stub.fetch,
      timeoutMs: 1000,
      retry: { ...retry, maxAttempts: 1 },
      retryDeps: instant,
      now: () => new Date(time),
      logger: { ...silentLogger, warn },
    });
    await provider.getKey(key.kid);
    time += 2 * 3600 * 1000;
    expect(await provider.getKey(key.kid)).not.toBeNull();
    expect(warn).toHaveBeenCalledWith('using stale firebase keys', expect.anything());
    time += 25 * 3600 * 1000;
    await expect(provider.getKey(key.kid)).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
    });
  });

  it('lets a failed download be retried by the next caller', async () => {
    const key = await makeKey();
    const { provider } = build((call) => (call <= 3 ? { status: 500 } : { body: jwks(key) }));
    await expect(provider.getKey(key.kid)).rejects.toBeDefined();
    expect(await provider.getKey(key.kid)).not.toBeNull();
  });
});
