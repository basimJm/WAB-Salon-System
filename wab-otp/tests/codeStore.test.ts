import { MemoryCodeStore } from '../src/adapters/code-store/memory';
import { RedisCodeStore } from '../src/adapters/code-store/redis';
import type { RedisClientLike } from '../src/adapters/redis-store';
import type { CodeStore } from '../src/ports';
import { startTestRedis, type TestRedis } from './helpers/redis';

const contract = (
  name: string,
  make: () => CodeStore,
  advance: (ms: number) => Promise<void>,
): void => {
  describe(`${name} CodeStore contract`, () => {
    let store: CodeStore;
    beforeEach(() => {
      store = make();
    });

    it('sets, gets, replaces and deletes with a single winner', async () => {
      expect(await store.get('k')).toBeNull();
      await store.set('k', 'a', 60_000);
      await store.set('k', 'b', 60_000);
      expect(await store.get('k')).toBe('b');
      const deletions = await Promise.all([store.delete('k'), store.delete('k')]);
      expect(deletions.sort()).toEqual([false, true]);
      expect(await store.get('k')).toBeNull();
    });

    it('sets only once when absent', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () => store.setIfAbsent('used', '1', 60_000)),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await store.get('used')).toBe('1');
    });

    it('expires entries after their TTL', async () => {
      await store.set('t', 'v', 50);
      await store.setIfAbsent('u', '1', 50);
      await advance(80);
      expect(await store.get('t')).toBeNull();
      expect(await store.delete('t')).toBe(false);
      expect(await store.setIfAbsent('u', '2', 50)).toBe(true);
    });
  });
};

let clock = 0;
contract(
  'memory',
  () => new MemoryCodeStore(() => clock),
  (ms) => {
    clock += ms;
    return Promise.resolve();
  },
);

describe('MemoryCodeStore', () => {
  it('is local, uses real time by default and counts live entries', async () => {
    const store = new MemoryCodeStore();
    expect(store.scope).toBe('local');
    await store.set('a', '1', 60_000);
    await store.set('b', '1', -1);
    expect(store.size()).toBe(1);
  });
});

describe('RedisCodeStore', () => {
  let redis: TestRedis;
  beforeAll(async () => {
    redis = await startTestRedis();
    await redis.client.flushdb();
  });
  afterAll(async () => {
    await redis.stop();
  });

  contract(
    'redis',
    () => new RedisCodeStore(redis.client),
    (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  );

  it('is shared', () => {
    expect(new RedisCodeStore(redis.client).scope).toBe('shared');
  });

  const failing = (error: Error | null, evalReply: unknown = 1): RedisClientLike => ({
    eval: () => (error === null ? Promise.resolve(evalReply) : Promise.reject(error)),
    pttl: () => Promise.resolve(0),
    get: () => (error === null ? Promise.resolve(null) : Promise.reject(error)),
    del: () => (error === null ? Promise.resolve(0) : Promise.reject(error)),
  });

  it('maps connection failures to a retryable OTP_STORE_UNAVAILABLE', async () => {
    const store = new RedisCodeStore(failing(new Error('ECONNREFUSED')));
    for (const call of [
      () => store.set('k', 'v', 1),
      () => store.get('k'),
      () => store.delete('k'),
      () => store.setIfAbsent('k', 'v', 1),
    ])
      await expect(call()).rejects.toMatchObject({
        code: 'OTP_STORE_UNAVAILABLE',
        retryable: true,
      });
  });

  it('refuses an unexpected script reply', async () => {
    const store = new RedisCodeStore(failing(null, 'OK'));
    await expect(store.setIfAbsent('k', 'v', 1)).rejects.toMatchObject({
      code: 'OTP_MALFORMED_RESPONSE',
    });
    await expect(new RedisCodeStore(failing(null, 0)).setIfAbsent('k', 'v', 1)).resolves.toBe(
      false,
    );
  });
});
