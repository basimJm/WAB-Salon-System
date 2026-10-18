import { ERROR_CODES } from '../src/constants/codes';
import { NotificationError } from '../src/errors';
import { delayFor, isRetryable, realRetryDeps, withRetry, withTimeout } from '../src/retry';
import { FAST_RETRY, instantDeps } from './helpers';

const transient = (): NotificationError =>
  new NotificationError(ERROR_CODES.NETWORK_ERROR, 'down', { retryable: true });

describe('delayFor', () => {
  const policy = { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 1000, jitterRatio: 0.2 };
  it('doubles per attempt and caps at maxDelayMs', () => {
    expect(delayFor(1, { ...policy, jitterRatio: 0 }, () => 0.5)).toBe(100);
    expect(delayFor(2, { ...policy, jitterRatio: 0 }, () => 0.5)).toBe(200);
    expect(delayFor(3, { ...policy, jitterRatio: 0 }, () => 0.5)).toBe(400);
    expect(delayFor(10, { ...policy, jitterRatio: 0 }, () => 0.5)).toBe(1000);
  });
  it('applies symmetric jitter within the ratio', () => {
    expect(delayFor(1, policy, () => 0)).toBe(80);
    expect(delayFor(1, policy, () => 0.5)).toBe(100);
    expect(delayFor(1, policy, () => 0.999999)).toBe(120);
  });
  it('never returns a negative delay', () => {
    expect(delayFor(1, { ...policy, baseDelayMs: 0 }, () => 0)).toBe(0);
  });
});

describe('isRetryable', () => {
  it('is true only for retryable SDK errors', () => {
    expect(isRetryable(transient())).toBe(true);
    expect(isRetryable(new NotificationError(ERROR_CODES.AUTH_FAILED, 'x'))).toBe(false);
    expect(isRetryable(new Error('plain'))).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns the first success without sleeping', async () => {
    const { deps, sleeps } = instantDeps();
    await expect(withRetry(() => Promise.resolve('ok'), FAST_RETRY, deps)).resolves.toBe('ok');
    expect(sleeps).toEqual([]);
  });

  it('retries retryable errors with backoff and reports each retry', async () => {
    const { deps, sleeps } = instantDeps();
    const seen: number[] = [];
    let calls = 0;
    const result = await withRetry(
      (attempt) => {
        calls += 1;
        return attempt < 3 ? Promise.reject(transient()) : Promise.resolve(attempt);
      },
      FAST_RETRY,
      deps,
      (attempt) => seen.push(attempt),
    );
    expect(result).toBe(3);
    expect(calls).toBe(3);
    expect(seen).toEqual([1, 2]);
    expect(sleeps).toEqual([10, 20]);
  });

  it('gives up after maxAttempts and throws the last error', async () => {
    const { deps } = instantDeps();
    let calls = 0;
    await expect(
      withRetry(
        () => {
          calls += 1;
          return Promise.reject(transient());
        },
        FAST_RETRY,
        deps,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.NETWORK_ERROR });
    expect(calls).toBe(3);
  });

  it('does not retry non-retryable or foreign errors', async () => {
    const { deps } = instantDeps();
    let calls = 0;
    await expect(
      withRetry(
        () => {
          calls += 1;
          return Promise.reject(new NotificationError(ERROR_CODES.AUTH_FAILED, 'no'));
        },
        FAST_RETRY,
        deps,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_FAILED });
    await expect(
      withRetry(() => Promise.reject(new Error('plain')), FAST_RETRY, deps),
    ).rejects.toThrow('plain');
    expect(calls).toBe(1);
  });

  it('works without an onRetry hook', async () => {
    const { deps } = instantDeps();
    await expect(
      withRetry(
        (n) => (n < 2 ? Promise.reject(transient()) : Promise.resolve('done')),
        FAST_RETRY,
        deps,
      ),
    ).resolves.toBe('done');
  });
});

describe('withTimeout', () => {
  it('resolves when the work finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(1), 50, () => new Error('late'))).resolves.toBe(1);
  });
  it('rejects with the supplied error when the work is too slow', async () => {
    const slow = new Promise<number>((resolve) =>
      setTimeout(() => {
        resolve(1);
      }, 200),
    );
    await expect(withTimeout(slow, 10, () => new Error('late'))).rejects.toThrow('late');
  });
  it('propagates the work rejection', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('boom')), 50, () => new Error('late')),
    ).rejects.toThrow('boom');
  });
});

describe('realRetryDeps', () => {
  it('sleeps for real and returns a number in [0, 1)', async () => {
    const started = Date.now();
    await realRetryDeps.sleep(15);
    expect(Date.now() - started).toBeGreaterThanOrEqual(10);
    const value = realRetryDeps.random();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});
