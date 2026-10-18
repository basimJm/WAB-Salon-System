import { ERROR_CODES } from '../src/constants/codes';
import { configError, isPaymentSdkError, PaymentSdkError, validationError } from '../src/errors';
import { assertAmountFils, decimalToFils, filsToDecimal, isAmountFils } from '../src/money';
import { createRedactingLogger, redact, silentLogger, type Logger } from '../src/logger';
import { delayFor, isRetryable, withRetry, withTimeout, realRetryDeps } from '../src/retry';

describe('errors', () => {
  it('carries code, retryable, details and cause', () => {
    const cause = new Error('boom');
    const error = new PaymentSdkError(ERROR_CODES.TIMEOUT, 'slow', {
      retryable: true,
      cause,
      details: { a: 1 },
    });
    expect(error).toMatchObject({ code: 'PAY_TIMEOUT', retryable: true, details: { a: 1 } });
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('PaymentSdkError');
  });
  it('defaults to non-retryable without details or cause', () => {
    const error = new PaymentSdkError(ERROR_CODES.UNKNOWN, 'x');
    expect(error).toMatchObject({ retryable: false, details: {} });
    expect(error.cause).toBeUndefined();
  });
  it('builds config and validation errors, and recognises its own type', () => {
    expect(configError('bad', { fields: ['a'] }).details).toEqual({ fields: ['a'] });
    expect(configError('bad').code).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(validationError('bad').code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(isPaymentSdkError(validationError('x'))).toBe(true);
    expect(isPaymentSdkError(new Error('x'))).toBe(false);
  });
});

describe('money', () => {
  it('validates integer fils', () => {
    expect(isAmountFils(1)).toBe(true);
    for (const bad of [0, -1, 1.5, NaN, '5', 2 ** 53, 100_000_000_001]) {
      expect(isAmountFils(bad)).toBe(false);
    }
    expect(assertAmountFils(5)).toBe(5);
    expect(() => assertAmountFils(0, 'x')).toThrow('x must be');
  });
  it.each([
    [1, '0.001'],
    [500, '0.500'],
    [12_500, '12.500'],
    [1_000, '1.000'],
    [99_999_999, '99999.999'],
  ])('formats %i fils as %s', (fils, text) => {
    expect(filsToDecimal(fils, 'JOD')).toBe(text);
  });
  it('formats with 2 decimals only when exact', () => {
    expect(filsToDecimal(12_500, 'JOD', 2)).toBe('12.50');
    expect(filsToDecimal(10, 'JOD', 2)).toBe('0.01');
    expect(() => filsToDecimal(12_505, 'JOD', 2)).toThrow('not representable');
  });
  it('rejects more decimals than the currency has', () => {
    expect(() => filsToDecimal(1, 'JOD', 4 as never)).toThrow('not representable');
  });
  it('parses gateway amounts', () => {
    expect(decimalToFils('12.50', 'JOD')).toBe(12_500);
    expect(decimalToFils('12.500', 'JOD')).toBe(12_500);
    expect(decimalToFils('0.001', 'JOD')).toBe(1);
    expect(decimalToFils('7', 'JOD')).toBe(7000);
    expect(decimalToFils('0.5', 'JOD')).toBe(500);
  });
  it.each(['', '1.2345', '-1', '1,5', 'abc', '1e3', '9999999999999.0', 5, null, undefined])(
    'refuses malformed gateway amount %p',
    (value) => {
      expect(() => decimalToFils(value, 'JOD')).toThrow(PaymentSdkError);
    },
  );
  it('round-trips every 7th value up to 50 000 fils', () => {
    for (let fils = 1; fils < 50_000; fils += 7) {
      expect(decimalToFils(filsToDecimal(fils, 'JOD'), 'JOD')).toBe(fils);
    }
  });
});

describe('logger', () => {
  it('masks secrets, card-like numbers, nested and circular data without mutating', () => {
    const circular: Record<string, unknown> = { name: 'x' };
    circular.self = circular;
    const input = {
      accessToken: 'abc',
      card: { number: '4111 1111 1111 1111' },
      note: 'paid with 4111111111111111 ok',
      list: [{ password: 'p' }, 'safe'],
      iv: 'aa',
      tag: 'bb',
      idempotencyKey: 'keep-me-1234',
      count: 3,
      circular,
    };
    const out = redact(input) as Record<string, unknown>;
    expect(out.accessToken).toBe('[redacted]');
    expect(out.card).toBe('[redacted]');
    expect(out.note).toBe('paid with [redacted] ok');
    expect(out.list).toEqual([{ password: '[redacted]' }, 'safe']);
    expect(out).toMatchObject({ iv: '[redacted]', tag: '[redacted]', count: 3 });
    expect(out.idempotencyKey).toBe('keep-me-1234');
    expect((out.circular as Record<string, unknown>).self).toBe('[redacted]');
    expect(input.accessToken).toBe('abc');
  });
  it('cuts off deep structures', () => {
    let deep: Record<string, unknown> = { leaf: 1 };
    for (let i = 0; i < 10; i += 1) deep = { next: deep };
    expect(JSON.stringify(redact(deep))).toContain('[redacted]');
  });
  it('redacts every level and message through the wrapper', () => {
    const seen: unknown[][] = [];
    const inner: Logger = {
      debug: (...a) => seen.push(a),
      info: (...a) => seen.push(a),
      warn: (...a) => seen.push(a),
      error: (...a) => seen.push(a),
    };
    const log = createRedactingLogger(inner);
    log.debug('a 4111111111111111', { token: 't' });
    log.info('b');
    log.warn('c', { ok: 1 });
    log.error('d', { secret: 's' });
    expect(seen).toEqual([
      ['a [redacted]', { token: '[redacted]' }],
      ['b', undefined],
      ['c', { ok: 1 }],
      ['d', { secret: '[redacted]' }],
    ]);
  });
  it('has a silent logger', () => {
    expect(() => {
      silentLogger.debug('x');
      silentLogger.info('x');
      silentLogger.warn('x');
      silentLogger.error('x');
    }).not.toThrow();
  });
});

describe('retry', () => {
  const policy = { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 250, jitterRatio: 0.5 };
  const transient = (): PaymentSdkError =>
    new PaymentSdkError(ERROR_CODES.NETWORK_ERROR, 'down', { retryable: true });
  const deps = (): {
    sleeps: number[];
    sleep: (ms: number) => Promise<void>;
    random: () => number;
  } => {
    const sleeps: number[] = [];
    return { sleeps, sleep: (ms) => Promise.resolve(void sleeps.push(ms)), random: () => 0.5 };
  };

  it('computes capped exponential delays with jitter', () => {
    expect(delayFor(1, policy, () => 0.5)).toBe(100);
    expect(delayFor(2, policy, () => 0.5)).toBe(200);
    expect(delayFor(3, policy, () => 0.5)).toBe(250);
    expect(delayFor(1, policy, () => 0)).toBe(50);
    expect(delayFor(1, policy, () => 0.999)).toBeGreaterThan(100);
    expect(delayFor(1, { ...policy, jitterRatio: 5 }, () => 0)).toBe(0);
  });
  it('retries only retryable SDK errors', async () => {
    expect(isRetryable(transient())).toBe(true);
    expect(isRetryable(validationError('x'))).toBe(false);
    expect(isRetryable(new Error('x'))).toBe(false);
    const d = deps();
    let calls = 0;
    const result = await withRetry(
      (attempt) => {
        calls += 1;
        return attempt < 3 ? Promise.reject(transient()) : Promise.resolve('ok');
      },
      policy,
      d,
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
    expect(d.sleeps).toEqual([100, 200]);
  });
  it('gives up after the maximum and never retries a permanent error', async () => {
    const seen: number[] = [];
    await expect(
      withRetry(
        () => Promise.reject(transient()),
        policy,
        deps(),
        (a) => seen.push(a),
      ),
    ).rejects.toThrow('down');
    expect(seen).toEqual([1, 2]);
    let calls = 0;
    await expect(
      withRetry(
        () => {
          calls += 1;
          return Promise.reject(validationError('no'));
        },
        policy,
        deps(),
      ),
    ).rejects.toThrow('no');
    expect(calls).toBe(1);
  });
  it('has real deps that sleep and randomise', async () => {
    await realRetryDeps.sleep(1);
    expect(realRetryDeps.random()).toBeLessThan(1);
  });
  it('times out slow work and clears the timer on success', async () => {
    const onTimeout = (): PaymentSdkError => new PaymentSdkError(ERROR_CODES.TIMEOUT, 't');
    await expect(withTimeout(new Promise(() => undefined), 5, onTimeout)).rejects.toThrow('t');
    await expect(withTimeout(Promise.resolve(1), 1000, onTimeout)).resolves.toBe(1);
  });
});
