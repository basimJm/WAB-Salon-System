import { ERROR_CODES } from '../src/constants/codes';
import {
  fingerprintOf,
  MemoryIdempotencyStore,
  RedisIdempotencyStore,
  type RedisLike,
} from '../src/idempotency';

class FakeRedis implements RedisLike {
  readonly data = new Map<string, string>();
  get(key: string): Promise<string | null> {
    return Promise.resolve(this.data.get(key) ?? null);
  }
  set(
    key: string,
    value: string,
    _mode: 'EX',
    _sec: number,
    setMode?: 'NX',
  ): Promise<string | null> {
    if (setMode === 'NX' && this.data.has(key)) return Promise.resolve(null);
    this.data.set(key, value);
    return Promise.resolve('OK');
  }
  del(key: string): Promise<number> {
    return Promise.resolve(this.data.delete(key) ? 1 : 0);
  }
}

describe('fingerprintOf', () => {
  it('is stable and sensitive to content', () => {
    expect(fingerprintOf({ a: 1 })).toBe(fingerprintOf({ a: 1 }));
    expect(fingerprintOf({ a: 1 })).not.toBe(fingerprintOf({ a: 2 }));
  });
});

describe('MemoryIdempotencyStore', () => {
  it('runs once per key and shares the result', async () => {
    const store = new MemoryIdempotencyStore();
    let runs = 0;
    const work = (): Promise<number> => Promise.resolve(++runs);
    const results = await Promise.all([store.run('k', 'f', work), store.run('k', 'f', work)]);
    expect(results).toEqual([1, 1]);
    expect(runs).toBe(1);
  });
  it('rejects the same key with different parameters', async () => {
    const store = new MemoryIdempotencyStore();
    await store.run('k', 'f1', () => Promise.resolve(1));
    await expect(store.run('k', 'f2', () => Promise.resolve(2))).rejects.toMatchObject({
      code: ERROR_CODES.DUPLICATE,
    });
  });
  it('forgets failures so the caller can retry', async () => {
    const store = new MemoryIdempotencyStore();
    await expect(store.run('k', 'f', () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(store.run('k', 'f', () => Promise.resolve('ok'))).resolves.toBe('ok');
  });
  it('expires entries after the ttl', async () => {
    let now = 0;
    const store = new MemoryIdempotencyStore(1, () => now);
    await store.run('k', 'f', () => Promise.resolve(1));
    now = 1001;
    await expect(store.run('k', 'f', () => Promise.resolve(2))).resolves.toBe(2);
  });
});

describe('RedisIdempotencyStore', () => {
  it('stores the result and replays it', async () => {
    const store = new RedisIdempotencyStore(new FakeRedis());
    let runs = 0;
    const work = (): Promise<{ n: number }> => Promise.resolve({ n: ++runs });
    expect(await store.run('k', 'f', work)).toEqual({ n: 1 });
    expect(await store.run('k', 'f', work)).toEqual({ n: 1 });
    expect(runs).toBe(1);
  });
  it('conflicts on a different fingerprint', async () => {
    const store = new RedisIdempotencyStore(new FakeRedis());
    await store.run('k', 'f1', () => Promise.resolve(1));
    await expect(store.run('k', 'f2', () => Promise.resolve(1))).rejects.toMatchObject({
      code: ERROR_CODES.DUPLICATE,
    });
  });
  it('reports a still-running duplicate as retryable', async () => {
    const redis = new FakeRedis();
    const store = new RedisIdempotencyStore(redis, 60, 'p:');
    redis.data.set('p:k', JSON.stringify({ state: 'pending', fingerprint: 'f' }));
    await expect(store.run('k', 'f', () => Promise.resolve(1))).rejects.toMatchObject({
      code: ERROR_CODES.DUPLICATE_IN_PROGRESS,
      retryable: true,
    });
  });
  it('removes the claim when the operation fails', async () => {
    const redis = new FakeRedis();
    const store = new RedisIdempotencyStore(redis);
    await expect(store.run('k', 'f', () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    expect(redis.data.size).toBe(0);
  });
  it('handles a lost claim race by reading the winner', async () => {
    const redis = new FakeRedis();
    const store = new RedisIdempotencyStore(redis, 60, 'p:');
    const realGet = redis.get.bind(redis);
    let first = true;
    redis.get = (key): Promise<string | null> => {
      if (first) {
        first = false;
        redis.data.set(key, JSON.stringify({ state: 'done', fingerprint: 'f', result: 'won' }));
        return Promise.resolve(null);
      }
      return realGet(key);
    };
    await expect(store.run('k', 'f', () => Promise.resolve('lost'))).resolves.toBe('won');
  });
  it('retries from scratch when the winner vanished', async () => {
    const redis = new FakeRedis();
    const store = new RedisIdempotencyStore(redis, 60, 'p:');
    const realSet = redis.set.bind(redis);
    let first = true;
    redis.set = (...args): Promise<string | null> => {
      if (first) {
        first = false;
        return Promise.resolve(null);
      }
      return realSet(...args);
    };
    await expect(store.run('k', 'f', () => Promise.resolve('ok'))).resolves.toBe('ok');
  });
  it('flags a corrupt record', async () => {
    const redis = new FakeRedis();
    redis.data.set('wab:payments:idem:k', JSON.stringify({ nope: true }));
    await expect(
      new RedisIdempotencyStore(redis).run('k', 'f', () => Promise.resolve(1)),
    ).rejects.toMatchObject({ code: ERROR_CODES.MALFORMED_RESPONSE });
  });
});
