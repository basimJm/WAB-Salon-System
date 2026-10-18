import { RedisLimitStore, type RedisClientLike } from '../src/adapters/redis-store';
import { createLimits } from '../src/limits';
import type { HitSpec } from '../src/ports';
import { startTestRedis, type TestRedis } from './helpers/redis';

const spec = (over: Partial<HitSpec> = {}): HitSpec => ({
  counterKey: 'c',
  blockKey: 'b',
  limit: 3,
  windowMs: 5000,
  blockMs: 60_000,
  ...over,
});
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('RedisLimitStore (real Redis on localhost)', () => {
  let redis: TestRedis;
  let store: RedisLimitStore;
  beforeAll(async () => {
    redis = await startTestRedis();
  });
  afterAll(async () => {
    await redis.stop();
  });
  beforeEach(async () => {
    await redis.client.flushdb();
    store = new RedisLimitStore(redis.client);
  });

  it('is shared', () => {
    expect(store.scope).toBe('shared');
  });

  it('allows below the limit; the hit that reaches it starts the block; later hits are denied uncounted', async () => {
    expect(await store.hit(spec())).toMatchObject({ allowed: true, blocked: false, count: 1 });
    expect(await store.hit(spec())).toMatchObject({ allowed: true, blocked: false, count: 2 });
    const third = await store.hit(spec());
    expect(third).toMatchObject({ allowed: true, blocked: true, count: 3, retryAfterMs: 60_000 });
    const denied = await store.hit(spec());
    expect(denied).toMatchObject({ allowed: false, blocked: true });
    expect(denied.retryAfterMs).toBeGreaterThan(0);
    expect(denied.retryAfterMs).toBeLessThanOrEqual(60_000);
    expect(await store.countOf('c')).toBe(0);
    expect(await store.blockTtlMs('b')).toBeGreaterThan(0);
  });

  it('gives every counter a TTL and heals one that lost it', async () => {
    await store.hit(spec());
    expect(await redis.client.pttl('c')).toBeGreaterThan(0);
    await redis.client.persist('c');
    await store.hit(spec());
    expect(await redis.client.pttl('c')).toBeGreaterThan(0);
  });

  it('expires the window and the block by time', async () => {
    const fast = spec({ limit: 1, windowMs: 200, blockMs: 150 });
    expect(await store.hit(fast)).toMatchObject({ blocked: true });
    await sleep(250);
    expect(await store.blockTtlMs('b')).toBe(0);
    expect(await store.hit(fast)).toMatchObject({ allowed: true, count: 1 });
  });

  it('denies above the limit in a plain window (no block)', async () => {
    const plain = spec({ limit: 1, blockMs: 0 });
    expect((await store.hit(plain)).allowed).toBe(true);
    expect(await store.hit(plain)).toMatchObject({ allowed: false, blocked: false, count: 2 });
  });

  it('shares one block between counters', async () => {
    await store.hit(spec({ counterKey: 'req', limit: 1 }));
    expect(await store.hit(spec({ counterKey: 'wrong' }))).toMatchObject({
      allowed: false,
      blocked: true,
    });
  });

  it('is atomic under concurrency: exactly `limit` hits are allowed before the block', async () => {
    const results = await Promise.all(
      Array.from({ length: 40 }, () => store.hit(spec({ limit: 10 }))),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(10);
    expect(results.filter((r) => !r.allowed)).toHaveLength(30);
  });

  it('starts a cooldown once, even with concurrent callers', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => store.startCooldown('r', 5000)),
    );
    expect(results.filter((r) => r.started)).toHaveLength(1);
    const later = await store.startCooldown('r', 5000);
    expect(later.started).toBe(false);
    expect(later.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets keys (and ignores an empty list)', async () => {
    await store.hit(spec({ limit: 1 }));
    await store.startCooldown('r', 5000);
    await store.reset([]);
    expect(await store.blockTtlMs('b')).toBeGreaterThan(0);
    await store.reset(['c', 'b', 'r']);
    expect(await store.blockTtlMs('b')).toBe(0);
    expect((await store.startCooldown('r', 5000)).started).toBe(true);
  });

  it('drives the limits engine end to end', async () => {
    const limits = createLimits(
      store,
      { requestMax: 2, requestWindowSec: 60, wrongMax: 2, blockSec: 60, resendAfterSec: 0 },
      'test:',
    );
    expect((await limits.request('+962791234567')).allowed).toBe(true);
    expect((await limits.request('+962791234567')).blocked).toBe(false);
    expect(await limits.request('+962791234567')).toMatchObject({ allowed: false, blocked: true });
    await limits.reset('+962791234567');
    expect((await limits.wrongAttempt('+962791234567')).attemptsRemaining).toBe(1);
  });
});

describe('RedisLimitStore failures', () => {
  const down = new Error('ECONNREFUSED 10.0.0.1:6379 secret-host');
  const failing: RedisClientLike = {
    eval: () => Promise.reject(down),
    pttl: () => Promise.reject(down),
    get: () => Promise.reject(down),
    del: () => Promise.reject(down),
  };

  it('maps every outage to a retryable OTP_STORE_UNAVAILABLE without leaking the message', async () => {
    const store = new RedisLimitStore(failing);
    const calls = [
      store.hit(spec()),
      store.countOf('c'),
      store.blockTtlMs('b'),
      store.startCooldown('r', 1),
      store.reset(['a']),
    ];
    for (const call of calls) {
      await expect(call).rejects.toMatchObject({
        code: 'OTP_STORE_UNAVAILABLE',
        retryable: true,
        message: 'Limit store unavailable',
        cause: down,
      });
    }
  });

  it('rejects malformed script replies', async () => {
    for (const reply of ['nope', [1, 2, 3], [1, 'x', 3, 4], null]) {
      const store = new RedisLimitStore({ ...failing, eval: () => Promise.resolve(reply) });
      await expect(store.startCooldown('r', 1)).rejects.toMatchObject({
        code: 'OTP_MALFORMED_RESPONSE',
      });
    }
    const hitStore = new RedisLimitStore({ ...failing, eval: () => Promise.resolve([1, 2]) });
    await expect(hitStore.hit(spec())).rejects.toMatchObject({ code: 'OTP_MALFORMED_RESPONSE' });
  });

  it('never reports a negative TTL', async () => {
    const store = new RedisLimitStore({ ...failing, pttl: () => Promise.resolve(-2) });
    expect(await store.blockTtlMs('b')).toBe(0);
  });
});
