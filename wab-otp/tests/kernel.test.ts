import { ERROR_CODES } from '../src/constants/codes';
import { configError, isOtpError, OtpError, providerError, validationError } from '../src/errors';
import { maskPhone, redactFields, redactingLogger, silentLogger } from '../src/logging';
import type { Logger } from '../src/ports';
import { delayFor, isRetryable, realRetryDeps, withRetry, type RetryDeps } from '../src/retry';

const policy = { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 250, jitterRatio: 0.5 };

describe('errors', () => {
  it('carries code, retryable, details and cause', () => {
    const cause = new Error('x');
    const error = new OtpError(ERROR_CODES.VENDOR_ERROR, 'down', {
      retryable: true,
      cause,
      details: { a: 1 },
    });
    expect(error).toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
      retryable: true,
      name: 'OtpError',
    });
    expect(error.cause).toBe(cause);
    expect(error.details).toEqual({ a: 1 });
    expect(isOtpError(error)).toBe(true);
    expect(isOtpError(new Error('x'))).toBe(false);
  });

  it('defaults to non-retryable with empty details', () => {
    const error = new OtpError(ERROR_CODES.UNKNOWN, 'u');
    expect(error.retryable).toBe(false);
    expect(error.details).toEqual({});
    expect(error.cause).toBeUndefined();
  });

  it('builds config, validation and provider errors', () => {
    expect(configError('c', { key: 'k' })).toMatchObject({
      code: 'OTP_CONFIG_INVALID',
      details: { key: 'k' },
    });
    expect(configError('c').details).toEqual({});
    expect(validationError('v').code).toBe('OTP_INPUT_INVALID');
    const cause = new Error('c');
    const provider = providerError(ERROR_CODES.TIMEOUT, 't', true, cause);
    expect(provider).toMatchObject({ code: 'OTP_TIMEOUT', retryable: true });
    expect(provider.cause).toBe(cause);
    expect(providerError(ERROR_CODES.TIMEOUT, 't', false).cause).toBeUndefined();
  });
});

describe('logging', () => {
  it('masks phones keeping the last three digits', () => {
    expect(maskPhone('call +962791234567 now')).toBe('call +*********567 now');
    expect(maskPhone('no phone')).toBe('no phone');
  });

  it('redacts secrets, masks phones, recurses and does not mutate', () => {
    const input = {
      proof: 'abc',
      idToken: 'x',
      phone: '+962791234567',
      count: 2,
      nested: { password: 'p', note: 'to +962791234567' },
      list: ['+962791234567', { secret: 's' }],
      deep: { a: { b: { c: { d: 1 } } } },
    };
    const copy = JSON.stringify(input);
    const out = redactFields(input) as Record<string, unknown>;
    expect(out).toMatchObject({
      proof: '[REDACTED]',
      idToken: '[REDACTED]',
      phone: '+*********567',
      count: 2,
      nested: { password: '[REDACTED]', note: 'to +*********567' },
      list: ['+*********567', { secret: '[REDACTED]' }],
    });
    expect(JSON.stringify(out)).toContain('[REDACTED]');
    expect(JSON.stringify(input)).toBe(copy);
  });

  it('wraps a logger and silences a missing one', () => {
    const calls: [string, string, unknown][] = [];
    const inner: Logger = {
      debug: (m, f) => {
        calls.push(['debug', m, f]);
      },
      info: (m, f) => {
        calls.push(['info', m, f]);
      },
      warn: (m, f) => {
        calls.push(['warn', m, f]);
      },
      error: (m, f) => {
        calls.push(['error', m, f]);
      },
    };
    const logger = redactingLogger(inner);
    logger.debug('d +962791234567');
    logger.info('i', { token: 't' });
    logger.warn('w');
    logger.error('e');
    expect(calls).toEqual([
      ['debug', 'd +*********567', undefined],
      ['info', 'i', { token: '[REDACTED]' }],
      ['warn', 'w', undefined],
      ['error', 'e', undefined],
    ]);
    expect(redactingLogger(undefined)).toBe(silentLogger);
    expect(() => {
      silentLogger.debug('x');
      silentLogger.info('x');
      silentLogger.warn('x');
      silentLogger.error('x');
    }).not.toThrow();
  });
});

describe('retry', () => {
  const retryable = new OtpError(ERROR_CODES.NETWORK_ERROR, 'n', { retryable: true });
  const deps = (sleeps: number[]): RetryDeps => ({
    sleep: (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    },
    random: () => 0.5,
  });

  it('computes capped exponential delay with jitter', () => {
    expect(delayFor(1, policy, () => 0.5)).toBe(100);
    expect(delayFor(2, policy, () => 0.5)).toBe(200);
    expect(delayFor(3, policy, () => 0.5)).toBe(250);
    expect(delayFor(1, policy, () => 0)).toBe(50);
    expect(delayFor(1, { ...policy, jitterRatio: 5 }, () => 0)).toBe(0);
  });

  it('real deps sleep and give random numbers in [0, 1)', async () => {
    await expect(realRetryDeps.sleep(1)).resolves.toBeUndefined();
    const value = realRetryDeps.random();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('knows which errors are retryable', () => {
    expect(isRetryable(retryable)).toBe(true);
    expect(isRetryable(new OtpError(ERROR_CODES.UNKNOWN, 'u'))).toBe(false);
    expect(isRetryable(new Error('x'))).toBe(false);
  });

  it('retries retryable errors then succeeds and reports each retry', async () => {
    const sleeps: number[] = [];
    const seen: number[] = [];
    let calls = 0;
    const result = await withRetry(
      () => {
        calls += 1;
        return calls < 3 ? Promise.reject(retryable) : Promise.resolve('ok');
      },
      policy,
      deps(sleeps),
      (attempt) => seen.push(attempt),
    );
    expect(result).toBe('ok');
    expect(sleeps).toEqual([100, 200]);
    expect(seen).toEqual([1, 2]);
  });

  it('gives up after maxAttempts and never retries other errors', async () => {
    let calls = 0;
    await expect(
      withRetry(
        () => {
          calls += 1;
          return Promise.reject(retryable);
        },
        policy,
        deps([]),
      ),
    ).rejects.toBe(retryable);
    expect(calls).toBe(3);
    calls = 0;
    await expect(
      withRetry(
        () => {
          calls += 1;
          return Promise.reject(new Error('x'));
        },
        policy,
        deps([]),
      ),
    ).rejects.toThrow('x');
    expect(calls).toBe(1);
  });
});
