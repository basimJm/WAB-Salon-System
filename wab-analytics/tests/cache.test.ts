import { createAnalytics } from '../src/analytics';
import { MemoryEventStore } from '../src/adapters/memory/eventStore';
import { cacheKey, stableStringify } from '../src/cache/keys';
import { createQueryCache } from '../src/cache/queryCache';
import { MemoryCache, RedisCache } from '../src/cache/stores';
import { ERROR_CODES } from '../src/constants/codes';
import type { Logger } from '../src/logger';
import type { EventStore, RedisLike, ResultCache } from '../src/ports';
import { at, codeOf, ev } from './helpers';
import { resolveOptions } from '../src/config/options';

const warnings: string[] = [];
const logger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  error: () => undefined,
  warn: (message) => {
    warnings.push(message);
  },
};

beforeEach(() => {
  warnings.length = 0;
});

describe('keys', () => {
  it('ignores object key order and the order of names but not of steps', () => {
    expect(stableStringify({ b: 1, a: { d: 1, c: 2 } })).toBe(
      stableStringify({ a: { c: 2, d: 1 }, b: 1 }),
    );
    expect(stableStringify({ names: ['b', 'a'] })).toBe(stableStringify({ names: ['a', 'b'] }));
    expect(stableStringify({ steps: ['b', 'a'] })).not.toBe(stableStringify({ steps: ['a', 'b'] }));
  });

  it('writes dates as ISO text and builds a prefixed, short, stable key', () => {
    expect(stableStringify({ d: at('2026-03-01T00:00:00Z') })).toBe(
      '{"d":"2026-03-01T00:00:00.000Z"}',
    );
    const key = cacheKey('p', 'count', { a: 1 });
    expect(key).toMatch(/^p:count:[0-9a-f]{32}$/);
    expect(cacheKey('p', 'count', { a: 1 })).toBe(key);
    expect(cacheKey('p', 'count', { a: 2 })).not.toBe(key);
    expect(cacheKey('p', 'funnel', { a: 1 })).not.toBe(key);
  });
});

describe('stores', () => {
  it('memory cache expires entries and evicts the oldest', async () => {
    let now = 1000;
    const cache = new MemoryCache(2, () => now);
    expect(await cache.get('x')).toBeUndefined();
    await cache.set('a', '1', 10);
    await cache.set('b', '2', 10);
    await cache.set('c', '3', 10);
    expect(cache.size).toBe(2);
    expect(await cache.get('a')).toBeUndefined();
    expect(await cache.get('b')).toBe('2');
    await cache.set('b', '2b', 10);
    expect(await cache.get('b')).toBe('2b');
    now += 10_000;
    expect(await cache.get('b')).toBeUndefined();
    expect(await cache.get('c')).toBeUndefined();
  });

  it('redis cache maps null to a miss and sets with EX', async () => {
    const calls: unknown[][] = [];
    const redis: RedisLike = {
      get: (key) => Promise.resolve(key === 'hit' ? 'v' : null),
      set: (...args) => {
        calls.push(args);
        return Promise.resolve('OK');
      },
    };
    const cache = new RedisCache(redis);
    expect(await cache.get('hit')).toBe('v');
    expect(await cache.get('miss')).toBeUndefined();
    await cache.set('k', 'v', 30);
    expect(calls).toEqual([['k', 'v', 'EX', 30]]);
  });
});

describe('query cache', () => {
  const build = (
    cache: ResultCache | undefined,
    extra: { ttlSec?: number; staleSec?: number; now?: () => number } = {},
  ): ReturnType<typeof createQueryCache> =>
    createQueryCache({
      cache,
      ttlSec: extra.ttlSec ?? 60,
      staleSec: extra.staleSec ?? 0,
      keyPrefix: 'p',
      logger,
      ...(extra.now ? { now: extra.now } : {}),
    });

  it('passes through without a cache', async () => {
    const q = build(undefined);
    expect(await q.wrap('k', {}, () => Promise.resolve(1))).toBe(1);
  });

  it('computes once, then serves hits until the ttl ends', async () => {
    let now = 0;
    const q = build(new MemoryCache(10, () => now), { ttlSec: 10, now: () => now });
    let calls = 0;
    const task = (): Promise<number> => Promise.resolve((calls += 1));
    expect(await q.wrap('k', { a: 1 }, task)).toBe(1);
    expect(await q.wrap('k', { a: 1 }, task)).toBe(1);
    now = 9_999;
    expect(await q.wrap('k', { a: 1 }, task)).toBe(1);
    now = 10_000;
    expect(await q.wrap('k', { a: 1 }, task)).toBe(2);
    expect(await q.wrap('k', { a: 2 }, task)).toBe(3);
  });

  it('shares one computation between concurrent identical misses', async () => {
    const q = build(new MemoryCache(10));
    let calls = 0;
    const task = async (): Promise<number> => {
      calls += 1;
      await Promise.resolve();
      return calls;
    };
    const results = await Promise.all(Array.from({ length: 20 }, () => q.wrap('k', {}, task)));
    expect(new Set(results)).toEqual(new Set([1]));
    expect(calls).toBe(1);
  });

  it('serves a stale answer once and refreshes in the background', async () => {
    let now = 0;
    const store = new MemoryCache(10, () => now);
    const q = build(store, { ttlSec: 10, staleSec: 20, now: () => now });
    let calls = 0;
    const task = (): Promise<number> => Promise.resolve((calls += 1));
    expect(await q.wrap('k', {}, task)).toBe(1);
    now = 15_000;
    expect(await q.wrap('k', {}, task)).toBe(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toBe(2);
    expect(await q.wrap('k', {}, task)).toBe(2);
    now = 100_000;
    expect(await q.wrap('k', {}, task)).toBe(3);
  });

  it('logs a failed background refresh and keeps serving', async () => {
    let now = 0;
    const q = build(new MemoryCache(10, () => now), { ttlSec: 1, staleSec: 5, now: () => now });
    await q.wrap('k', {}, () => Promise.resolve(1));
    now = 2_000;
    expect(await q.wrap('k', {}, () => Promise.reject(new Error('down')))).toBe(1);
    await new Promise((resolve) => setImmediate(resolve));
    expect(warnings).toContain('analytics cache refresh failed');
  });

  it('ignores cache read/write failures and corrupt entries', async () => {
    const broken: ResultCache = {
      get: () => Promise.reject(new Error('redis down')),
      set: () => Promise.reject(new Error('redis down')),
    };
    expect(await build(broken).wrap('k', {}, () => Promise.resolve(7))).toBe(7);
    expect(warnings).toEqual(['analytics cache read failed', 'analytics cache write failed']);
    for (const text of ['not json', 'null', '{"at":"x"}', '{"at":1}']) {
      const corrupt: ResultCache = {
        get: () => Promise.resolve(text),
        set: () => Promise.resolve(),
      };
      expect(await build(corrupt).wrap('k', {}, () => Promise.resolve(9))).toBe(9);
    }
  });

  it('does not cache failures', async () => {
    const q = build(new MemoryCache(10));
    await expect(q.wrap('k', {}, () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    expect(await q.wrap('k', {}, () => Promise.resolve(5))).toBe(5);
  });
});

describe('service cache', () => {
  const rangeQuery = { from: at('2026-03-01T00:00:00Z'), to: at('2026-03-02T00:00:00Z') };

  it('serves equal queries from the cache with identical answers', async () => {
    const memory = new MemoryEventStore();
    await memory.append(ev('a.one', '2026-03-01T10:00:00Z', { actorId: 'u1' }));
    let counts = 0;
    const events: EventStore = {
      append: (e) => memory.append(e),
      find: (q) => memory.find(q),
      countActors: (q) => memory.countActors(q),
      count: (q) => {
        counts += 1;
        return memory.count(q);
      },
    };
    const analytics = createAnalytics(
      { environment: 'dev', cache: { store: 'memory' } },
      { events },
    );
    const first = await analytics.countEvents({
      ...rangeQuery,
      groupBy: 'NAME',
      names: ['a.one', 'b.two'],
    });
    const second = await analytics.countEvents({
      ...rangeQuery,
      groupBy: 'NAME',
      names: ['b.two', 'a.one'],
    });
    expect(second).toEqual(first);
    expect(counts).toBe(1);
    await analytics.overview(rangeQuery);
    await analytics.overview(rangeQuery);
    expect(counts).toBe(3);
  });

  it('builds redis and custom caches from options and validates them', async () => {
    const store = new Map<string, string>();
    const redis: RedisLike = {
      get: (key) => Promise.resolve(store.get(key) ?? null),
      set: (key, value) => {
        store.set(key, value);
        return Promise.resolve('OK');
      },
    };
    const viaRedis = createAnalytics({ environment: 'dev', cache: { store: 'redis', redis } });
    await viaRedis.countEvents({ ...rangeQuery, groupBy: 'NAME' });
    expect(store.size).toBe(1);

    const writes: string[] = [];
    const custom: ResultCache = {
      get: () => Promise.resolve(undefined),
      set: (key) => {
        writes.push(key);
        return Promise.resolve();
      },
    };
    const viaCustom = createAnalytics({ environment: 'dev', cache: { store: 'custom', custom } });
    await viaCustom.countEvents({ ...rangeQuery, groupBy: 'NAME' });
    expect(writes).toHaveLength(1);

    expect(codeOf(() => resolveOptions({ environment: 'dev', cache: { store: 'custom' } }))).toBe(
      ERROR_CODES.CONFIG_INVALID,
    );
  });
});
