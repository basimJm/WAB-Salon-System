import { ERROR_CODES } from '../src/constants/codes';
import {
  AnalyticsError,
  configError,
  isAnalyticsError,
  malformedError,
  notConfiguredError,
  rangeError,
  toAnalyticsError,
  unavailableError,
  validationError,
} from '../src/errors';
import { noopLogger, redact, redactingLogger, type Logger } from '../src/logger';
import { assertRange } from '../src/range';
import { backoffMs, withRetry } from '../src/retry';
import { resolveOptions, type AnalyticsOptions } from '../src/config/options';

const fakeCollection = {};
const prodBase: AnalyticsOptions = {
  environment: 'prod',
  provider: 'mongo',
  mongo: { events: fakeCollection, identityLinks: fakeCollection },
};

const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    return isAnalyticsError(error) ? error.code : 'NOT_ANALYTICS';
  }
  return 'NO_ERROR';
};

describe('errors', () => {
  it('sets retryable from the code and honours overrides', () => {
    expect(new AnalyticsError(ERROR_CODES.TIMEOUT, 'x').retryable).toBe(true);
    expect(new AnalyticsError(ERROR_CODES.AUTH_FAILED, 'x').retryable).toBe(false);
    expect(new AnalyticsError(ERROR_CODES.AUTH_FAILED, 'x', { retryable: true }).retryable).toBe(
      true,
    );
  });

  it('keeps cause and details', () => {
    const cause = new Error('inner');
    const error = new AnalyticsError(ERROR_CODES.UNKNOWN, 'x', { cause, details: { a: 1 } });
    expect(error.cause).toBe(cause);
    expect(error.details).toEqual({ a: 1 });
    expect(new AnalyticsError(ERROR_CODES.UNKNOWN, 'x').details).toEqual({});
  });

  it('builds the typed helpers', () => {
    expect(configError('m').code).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(configError('m', { paths: ['a'] }).details).toEqual({ paths: ['a'] });
    expect(validationError('m').code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(validationError('m', { f: 1 }).details).toEqual({ f: 1 });
    expect(rangeError('m').code).toBe(ERROR_CODES.ANALYTICS_RANGE_INVALID);
    expect(rangeError('m', { max: 1 }).details).toEqual({ max: 1 });
    expect(notConfiguredError('m').code).toBe(ERROR_CODES.ANALYTICS_NOT_CONFIGURED);
    expect(unavailableError('m').retryable).toBe(true);
    expect(unavailableError('m', new Error('c')).cause).toBeInstanceOf(Error);
    expect(malformedError('m').code).toBe(ERROR_CODES.MALFORMED_RESPONSE);
    expect(malformedError('m', 'c').cause).toBe('c');
  });

  it('normalizes any thrown value', () => {
    const own = unavailableError('m');
    expect(toAnalyticsError(own)).toBe(own);
    const wrapped = toAnalyticsError('boom');
    expect(wrapped.code).toBe(ERROR_CODES.UNKNOWN);
    expect(wrapped.cause).toBe('boom');
    expect(isAnalyticsError(new Error('x'))).toBe(false);
  });
});

describe('logger', () => {
  it('noop logger accepts every call', () => {
    noopLogger.debug('a');
    noopLogger.info('a');
    noopLogger.warn('a');
    noopLogger.error('a');
  });

  it('redacts secrets at any depth without mutating the input', () => {
    const input = { token: 'abc', safe: 1, nested: { password: 'p', list: [{ cardNumber: '1' }] } };
    const out = redact(input) as typeof input;
    expect(out.token).toBe('[redacted]');
    expect(out.safe).toBe(1);
    expect(out.nested.password).toBe('[redacted]');
    expect(out.nested.list[0]?.cardNumber).toBe('[redacted]');
    expect(input.token).toBe('abc');
  });

  it('keeps gateway codes, dates and primitives; cuts deep objects', () => {
    const date = new Date(0);
    expect(redact({ code: '05', at: date })).toEqual({ code: '05', at: date });
    expect(redact('x')).toBe('x');
    expect(redact(null)).toBeNull();
    const deep = { a: { b: { c: { d: { e: 1 } } } } };
    expect(JSON.stringify(redact(deep))).toContain('[redacted]');
  });

  it('wraps a logger so every level redacts fields', () => {
    const calls: [string, string, unknown][] = [];
    const base: Logger = {
      debug: (m, f) => calls.push(['debug', m, f]),
      info: (m, f) => calls.push(['info', m, f]),
      warn: (m, f) => calls.push(['warn', m, f]),
      error: (m, f) => calls.push(['error', m, f]),
    };
    const log = redactingLogger(base);
    log.debug('d', { secret: 1 });
    log.info('i');
    log.warn('w', { a: 1 });
    log.error('e', { token: 't' });
    expect(calls).toEqual([
      ['debug', 'd', { secret: '[redacted]' }],
      ['info', 'i', undefined],
      ['warn', 'w', { a: 1 }],
      ['error', 'e', { token: '[redacted]' }],
    ]);
  });
});

describe('assertRange', () => {
  const from = new Date('2026-01-01T00:00:00Z');
  it('accepts a valid range', () => {
    expect(() => {
      assertRange({ from, to: new Date('2026-01-31T00:00:00Z') }, 92);
    }).not.toThrow();
  });
  it('rejects invalid dates, empty and reversed ranges, and too long spans', () => {
    const bad = new Date('nope');
    expect(
      codeOf(() => {
        assertRange({ from: bad, to: from }, 92);
      }),
    ).toBe(ERROR_CODES.ANALYTICS_RANGE_INVALID);
    expect(
      codeOf(() => {
        assertRange({ from, to: bad }, 92);
      }),
    ).toBe(ERROR_CODES.ANALYTICS_RANGE_INVALID);
    expect(
      codeOf(() => {
        assertRange({ from, to: from }, 92);
      }),
    ).toBe(ERROR_CODES.ANALYTICS_RANGE_INVALID);
    expect(
      codeOf(() => {
        assertRange({ from, to: new Date('2026-06-01T00:00:00Z') }, 92);
      }),
    ).toBe(ERROR_CODES.ANALYTICS_RANGE_INVALID);
    expect(
      codeOf(() => {
        assertRange({ from: 'x' as unknown as Date, to: from }, 92);
      }),
    ).toBe(ERROR_CODES.ANALYTICS_RANGE_INVALID);
  });
  it('allows exactly the maximum span', () => {
    expect(() => {
      assertRange({ from, to: new Date(from.getTime() + 2 * 86_400_000) }, 2);
    }).not.toThrow();
  });
});

describe('retry', () => {
  const policy = { attempts: 3, baseDelayMs: 100, maxDelayMs: 250 };

  it('computes capped backoff with jitter', () => {
    expect(backoffMs(policy, 1, () => 1)).toBe(100);
    expect(backoffMs(policy, 1, () => 0)).toBe(50);
    expect(backoffMs(policy, 5, () => 1)).toBe(250);
  });

  it('retries retryable errors then succeeds', async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const result = await withRetry(
      () => {
        calls += 1;
        return calls < 3 ? Promise.reject(unavailableError('down')) : Promise.resolve('ok');
      },
      policy,
      {
        sleep: (ms) => {
          sleeps.push(ms);
          return Promise.resolve();
        },
        random: () => 1,
      },
    );
    expect(result).toBe('ok');
    expect(sleeps).toEqual([100, 200]);
  });

  it('gives up after the attempts and rethrows', async () => {
    let calls = 0;
    await expect(
      withRetry(
        () => {
          calls += 1;
          return Promise.reject(unavailableError('down'));
        },
        policy,
        {
          sleep: () => Promise.resolve(),
        },
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.ANALYTICS_UNAVAILABLE });
    expect(calls).toBe(3);
  });

  it('does not retry non-retryable or foreign errors', async () => {
    let calls = 0;
    await expect(
      withRetry(() => {
        calls += 1;
        return Promise.reject(rangeError('bad'));
      }, policy),
    ).rejects.toMatchObject({ code: ERROR_CODES.ANALYTICS_RANGE_INVALID });
    await expect(withRetry(() => Promise.reject(new Error('x')), policy)).rejects.toThrow('x');
    expect(calls).toBe(1);
  });

  it('really sleeps with the default hooks', async () => {
    let calls = 0;
    const value = await withRetry(
      () => {
        calls += 1;
        return calls < 2 ? Promise.reject(unavailableError('d')) : Promise.resolve(1);
      },
      { attempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
    );
    expect(value).toBe(1);
  });
});

describe('resolveOptions', () => {
  it('fills dev defaults with the memory provider', () => {
    const options = resolveOptions({ environment: 'dev' });
    expect(options.provider).toBe('memory');
    expect(options.timeZone).toBe('Asia/Amman');
    expect(options.limits.maxRangeDays).toBe(92);
    expect(options.retry.attempts).toBe(3);
    expect(options.cache.store).toBe('none');
    expect(options.warehouse.provider).toBe('none');
    expect(options.collections.events).toBe('serverEvents');
  });

  it('accepts a full prod configuration', () => {
    const options = resolveOptions({
      ...prodBase,
      warehouse: {
        provider: 'bigquery',
        bigquery: { projectId: 'p-1', dataset: 'analytics_1', credentials: '{"a":1}' },
      },
      cache: { store: 'redis', redis: {} },
      logger: noopLogger,
    });
    expect(options.provider).toBe('mongo');
    expect(options.warehouse.bigquery?.eventsPrefix).toBe('events_');
  });

  it('defaults to mongo in prod and requires its collections', () => {
    expect(codeOf(() => resolveOptions({ environment: 'prod' }))).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(resolveOptions({ environment: 'prod', mongo: prodBase.mongo }).provider).toBe('mongo');
  });

  it('refuses memory in prod and the memory warehouse in prod', () => {
    expect(codeOf(() => resolveOptions({ ...prodBase, provider: 'memory' }))).toBe(
      ERROR_CODES.CONFIG_INVALID,
    );
    expect(codeOf(() => resolveOptions({ ...prodBase, warehouse: { provider: 'memory' } }))).toBe(
      ERROR_CODES.CONFIG_INVALID,
    );
  });

  it('requires mongo collections when provider is mongo in dev', () => {
    expect(codeOf(() => resolveOptions({ environment: 'dev', provider: 'mongo' }))).toBe(
      ERROR_CODES.CONFIG_INVALID,
    );
  });

  it('validates the time zone, numbers and unknown keys without echoing values', () => {
    expect(codeOf(() => resolveOptions({ environment: 'dev', timeZone: 'Mars/Base' }))).toBe(
      ERROR_CODES.CONFIG_INVALID,
    );
    expect(codeOf(() => resolveOptions({ environment: 'dev', queryTimeoutMs: -1 }))).toBe(
      ERROR_CODES.CONFIG_INVALID,
    );
    expect(codeOf(() => resolveOptions({ environment: 'dev', nope: 1 } as never))).toBe(
      ERROR_CODES.CONFIG_INVALID,
    );
    try {
      resolveOptions({ environment: 'dev', cache: { store: 'redis' } });
    } catch (error) {
      expect(isAnalyticsError(error) && error.details).toEqual({ paths: ['cache.redis'] });
    }
  });

  it('checks bigquery requirements', () => {
    const dev = (bigquery: object): AnalyticsOptions => ({
      environment: 'dev',
      warehouse: { provider: 'bigquery', bigquery },
    });
    expect(
      codeOf(() => resolveOptions({ environment: 'dev', warehouse: { provider: 'bigquery' } })),
    ).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(codeOf(() => resolveOptions(dev({ projectId: 'p-1' })))).toBe(
      ERROR_CODES.CONFIG_INVALID,
    );
    expect(codeOf(() => resolveOptions(dev({ projectId: 'bad id', dataset: 'd' })))).toBe(
      ERROR_CODES.CONFIG_INVALID,
    );
    expect(() => resolveOptions(dev({ projectId: 'p-1', dataset: 'd' }))).not.toThrow();
    expect(
      codeOf(() =>
        resolveOptions({
          ...prodBase,
          warehouse: { provider: 'bigquery', bigquery: { projectId: 'p-1', dataset: 'd' } },
        }),
      ),
    ).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(() =>
      resolveOptions({
        ...prodBase,
        warehouse: {
          provider: 'bigquery',
          bigquery: { projectId: 'p-1', dataset: 'd', client: {} },
        },
      }),
    ).not.toThrow();
  });
});
