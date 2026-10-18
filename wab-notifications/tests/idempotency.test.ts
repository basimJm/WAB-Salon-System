import { ERROR_CODES } from '../src/constants/codes';
import {
  MemoryIdempotencyStore,
  RedisIdempotencyStore,
  fingerprintOf,
  type RedisLike,
} from '../src/idempotency';

describe('fingerprintOf', () => {
  it('is stable and differs per value', () => {
    expect(fingerprintOf({ a: 1 })).toBe(fingerprintOf({ a: 1 }));
    expect(fingerprintOf({ a: 1 })).not.toBe(fingerprintOf({ a: 2 }));
    expect(fingerprintOf({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('MemoryIdempotencyStore', () => {
  it('runs once per key and replays the first result', async () => {
    const store = new MemoryIdempotencyStore();
    let runs = 0;
    const op = (): Promise<number> => {
      runs += 1;
      return Promise.resolve(runs);
    };
    await expect(store.run('key-00001', 'f', op)).resolves.toBe(1);
    await expect(store.run('key-00001', 'f', op)).resolves.toBe(1);
    expect(runs).toBe(1);
  });

  it('shares one in-flight operation between concurrent callers', async () => {
    const store = new MemoryIdempotencyStore();
    let runs = 0;
    const op = async (): Promise<string> => {
      runs += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'done';
    };
    const results = await Promise.all(
      Array.from({ length: 10 }, () => store.run('key-00001', 'f', op)),
    );
    expect(results).toEqual(Array<string>(10).fill('done'));
    expect(runs).toBe(1);
  });

  it('rejects the same key with a different fingerprint', async () => {
    const store = new MemoryIdempotencyStore();
    await store.run('key-00001', 'a', () => Promise.resolve(1));
    await expect(store.run('key-00001', 'b', () => Promise.resolve(2))).rejects.toMatchObject({
      code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
    });
  });

  it('forgets failures so the caller can retry', async () => {
    const store = new MemoryIdempotencyStore();
    await expect(
      store.run('key-00001', 'f', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    await expect(store.run('key-00001', 'f', () => Promise.resolve('ok'))).resolves.toBe('ok');
  });

  it('expires entries after the ttl', async () => {
    let now = 0;
    const store = new MemoryIdempotencyStore(10, () => now);
    let runs = 0;
    const op = (): Promise<number> => Promise.resolve((runs += 1));
    await store.run('key-00001', 'f', op);
    now = 9_999;
    await store.run('key-00001', 'f', op);
    expect(runs).toBe(1);
    now = 10_001;
    await store.run('key-00001', 'f', op);
    expect(runs).toBe(2);
  });

  it('does not evict a newer entry when an older failed promise settles late', async () => {
    let now = 0;
    const store = new MemoryIdempotencyStore(1, () => now);
    let rejectFirst: (error: Error) => void = () => undefined;
    const first = store.run(
      'key-00001',
      'f',
      () =>
        new Promise<string>((_, reject) => {
          rejectFirst = reject;
        }),
    );
    now = 5_000; // first entry expired; a new run replaces it
    await store.run('key-00001', 'f', () => Promise.resolve('second'));
    rejectFirst(new Error('late'));
    await expect(first).rejects.toThrow('late');
    await expect(store.run('key-00001', 'f', () => Promise.resolve('third'))).resolves.toBe(
      'second',
    );
  });
});

class FakeRedis implements RedisLike {
  readonly data = new Map<string, string>();
  readonly ttls: number[] = [];
  beforeSetNx: (() => void) | undefined;
  get(key: string): Promise<string | null> {
    return Promise.resolve(this.data.get(key) ?? null);
  }
  set(key: string, value: string, _mode: 'EX', seconds: number, nx?: 'NX'): Promise<string | null> {
    this.beforeSetNx?.();
    this.beforeSetNx = undefined;
    if (nx === 'NX' && this.data.has(key)) return Promise.resolve(null);
    this.data.set(key, value);
    this.ttls.push(seconds);
    return Promise.resolve('OK');
  }
  del(key: string): Promise<number> {
    return Promise.resolve(this.data.delete(key) ? 1 : 0);
  }
}

describe('RedisIdempotencyStore', () => {
  it('stores pending then the result with the ttl and replays it', async () => {
    const redis = new FakeRedis();
    const store = new RedisIdempotencyStore(redis, 60, 'p:');
    let runs = 0;
    const op = (): Promise<{ n: number }> => Promise.resolve({ n: (runs += 1) });
    await expect(store.run('key-00001', 'f', op)).resolves.toEqual({ n: 1 });
    await expect(store.run('key-00001', 'f', op)).resolves.toEqual({ n: 1 });
    expect(runs).toBe(1);
    expect([...redis.data.keys()]).toEqual(['p:key-00001']);
    expect(redis.ttls).toEqual([60, 60]);
  });

  it('uses the default ttl and prefix', async () => {
    const redis = new FakeRedis();
    await new RedisIdempotencyStore(redis).run('key-00001', 'f', () => Promise.resolve(1));
    expect([...redis.data.keys()][0]).toMatch(/^wab:notifications:idem:/);
    expect(redis.ttls[0]).toBe(86_400);
  });

  it('reports a running duplicate as retryable', async () => {
    const redis = new FakeRedis();
    const store = new RedisIdempotencyStore(redis);
    let release: () => void = () => undefined;
    const first = store.run(
      'key-00001',
      'f',
      () =>
        new Promise<number>((r) => {
          release = () => {
            r(1);
          };
        }),
    );
    await new Promise((resolve) => setImmediate(resolve));
    await expect(store.run('key-00001', 'f', () => Promise.resolve(2))).rejects.toMatchObject({
      code: ERROR_CODES.DUPLICATE_IN_PROGRESS,
      retryable: true,
    });
    release();
    await first;
  });

  it('rejects a different fingerprint', async () => {
    const store = new RedisIdempotencyStore(new FakeRedis());
    await store.run('key-00001', 'a', () => Promise.resolve(1));
    await expect(store.run('key-00001', 'b', () => Promise.resolve(1))).rejects.toMatchObject({
      code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
    });
  });

  it('deletes the marker when the operation fails', async () => {
    const redis = new FakeRedis();
    const store = new RedisIdempotencyStore(redis);
    await expect(
      store.run('key-00001', 'f', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    expect(redis.data.size).toBe(0);
    await expect(store.run('key-00001', 'f', () => Promise.resolve('ok'))).resolves.toBe('ok');
  });

  it('handles losing the claim race: pending winner → retryable duplicate', async () => {
    const redis = new FakeRedis();
    redis.beforeSetNx = () => {
      redis.data.set(
        'wab:notifications:idem:key-00001',
        JSON.stringify({ state: 'pending', fingerprint: 'f' }),
      );
    };
    await expect(
      new RedisIdempotencyStore(redis).run('key-00001', 'f', () => Promise.resolve(1)),
    ).rejects.toMatchObject({
      code: ERROR_CODES.DUPLICATE_IN_PROGRESS,
    });
  });

  it('handles losing the claim race when the winner vanished (claims again)', async () => {
    const redis = new FakeRedis();
    let lost = false;
    const realSet = redis.set.bind(redis);
    redis.set = (key, value, mode, seconds, nx) => {
      if (nx === 'NX' && !lost) {
        lost = true;
        return Promise.resolve(null); // somebody else claimed it, then released it
      }
      return realSet(key, value, mode, seconds, nx);
    };
    await expect(
      new RedisIdempotencyStore(redis).run('key-00001', 'f', () => Promise.resolve('ok')),
    ).resolves.toBe('ok');
  });

  it('treats a corrupt record as a malformed response', async () => {
    const redis = new FakeRedis();
    redis.data.set('wab:notifications:idem:key-00001', JSON.stringify({ nope: true }));
    await expect(
      new RedisIdempotencyStore(redis).run('key-00001', 'f', () => Promise.resolve(1)),
    ).rejects.toMatchObject({
      code: ERROR_CODES.MALFORMED_RESPONSE,
    });
    redis.data.set('wab:notifications:idem:key-00002', 'null');
    await expect(
      new RedisIdempotencyStore(redis).run('key-00002', 'f', () => Promise.resolve(1)),
    ).rejects.toMatchObject({
      code: ERROR_CODES.MALFORMED_RESPONSE,
    });
  });
});
