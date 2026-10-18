import { MemoryLimitStore } from '../src/adapters/memory-store';
import type { HitSpec } from '../src/ports';

const spec = (over: Partial<HitSpec> = {}): HitSpec => ({
  counterKey: 'c',
  blockKey: 'b',
  limit: 3,
  windowMs: 1000,
  blockMs: 5000,
  ...over,
});

describe('MemoryLimitStore', () => {
  let time = 0;
  let store: MemoryLimitStore;
  beforeEach(() => {
    time = 1_000;
    store = new MemoryLimitStore(() => time);
  });

  it('is process-local', () => {
    expect(store.scope).toBe('local');
  });

  it('allows hits below the limit and the hit that reaches it starts the block', async () => {
    expect(await store.hit(spec())).toMatchObject({ allowed: true, blocked: false, count: 1 });
    expect(await store.hit(spec())).toMatchObject({ allowed: true, blocked: false, count: 2 });
    expect(await store.hit(spec())).toMatchObject({
      allowed: true,
      blocked: true,
      count: 3,
      retryAfterMs: 5000,
    });
    expect(await store.blockTtlMs('b')).toBe(5000);
    expect(await store.hit(spec())).toMatchObject({
      allowed: false,
      blocked: true,
      retryAfterMs: 5000,
    });
  });

  it('reports the previous count while blocked and counts nothing new', async () => {
    await store.hit(spec({ limit: 1 }));
    time += 1000;
    expect(await store.hit(spec({ limit: 1 }))).toMatchObject({
      allowed: false,
      retryAfterMs: 4000,
      count: 0,
    });
  });

  it('ends the block by time and starts a fresh window', async () => {
    await store.hit(spec({ limit: 1 }));
    time += 5000;
    expect(await store.blockTtlMs('b')).toBe(0);
    expect(await store.hit(spec({ limit: 2 }))).toMatchObject({
      allowed: true,
      blocked: false,
      count: 1,
    });
  });

  it('expires the window counter', async () => {
    await store.hit(spec());
    time += 1000;
    expect(await store.hit(spec())).toMatchObject({ count: 1 });
  });

  it('denies above the limit when there is no block (plain window)', async () => {
    const plain = spec({ limit: 2, blockMs: 0 });
    expect((await store.hit(plain)).allowed).toBe(true);
    expect((await store.hit(plain)).allowed).toBe(true);
    expect(await store.hit(plain)).toMatchObject({ allowed: false, blocked: false, count: 3 });
  });

  it('shares one block between counters', async () => {
    await store.hit(spec({ counterKey: 'req', limit: 1 }));
    expect(await store.hit(spec({ counterKey: 'wrong' }))).toMatchObject({
      allowed: false,
      blocked: true,
    });
  });

  it('lets only the first caller start a cooldown', async () => {
    expect(await store.startCooldown('r', 2000)).toEqual({ started: true, retryAfterMs: 2000 });
    time += 500;
    expect(await store.startCooldown('r', 2000)).toEqual({ started: false, retryAfterMs: 1500 });
    time += 1500;
    expect(await store.startCooldown('r', 2000)).toEqual({ started: true, retryAfterMs: 2000 });
  });

  it('resets counters, blocks and cooldowns', async () => {
    await store.hit(spec({ limit: 1 }));
    await store.startCooldown('r', 2000);
    await store.reset(['c', 'b', 'r']);
    expect(await store.blockTtlMs('b')).toBe(0);
    expect((await store.startCooldown('r', 2000)).started).toBe(true);
  });

  it('uses the real clock by default', async () => {
    const real = new MemoryLimitStore();
    expect((await real.hit(spec())).allowed).toBe(true);
  });
});
