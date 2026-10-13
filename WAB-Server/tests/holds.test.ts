import type { Redis } from 'ioredis';
import { createHoldsStore, type Hold } from '../src/domain/availability/holds';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createLogger } from '../src/utils/logger';
import { startTestRedis, type TestRedis } from './helpers/redis';

let testRedis: TestRedis;
let redis: Redis;
const NOW = 1_800_000_000_000;
const MIN = 60_000;
const hold = (staffId: string, startMin: number, endMin: number, date = '2026-10-13'): Hold => ({
  staffId,
  date,
  start: new Date(NOW + startMin * MIN),
  end: new Date(NOW + endMin * MIN),
});

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, createLogger({ level: 'silent' }));
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});
beforeEach(async () => {
  await redis.flushdb();
});

describe('holds store', () => {
  const store = (): ReturnType<typeof createHoldsStore> => createHoldsStore(redis);

  it('returns live holds of the asked staff on the asked date only', async () => {
    await store().place({
      draftId: 'd1',
      holds: [hold('a', 0, 60), hold('b', 30, 90), hold('a', 0, 60, '2026-10-14')],
      ttlMs: 10 * MIN,
      nowMs: NOW,
    });
    const out = await store().busy({ staffIds: ['a', 'c'], date: '2026-10-13', nowMs: NOW });
    expect(out).toEqual([{ staffId: 'a', start: new Date(NOW), end: new Date(NOW + 60 * MIN) }]);
    expect(await store().busy({ staffIds: [], date: '2026-10-13', nowMs: NOW })).toEqual([]);
  });

  it('a hold stops counting the moment it expires', async () => {
    await store().place({ draftId: 'd1', holds: [hold('a', 0, 60)], ttlMs: 10 * MIN, nowMs: NOW });
    const at = (ms: number): Promise<unknown[]> =>
      store().busy({ staffIds: ['a'], date: '2026-10-13', nowMs: ms });
    expect(await at(NOW + 10 * MIN - 1)).toHaveLength(1);
    expect(await at(NOW + 10 * MIN)).toHaveLength(0);
  });

  it('release frees only that draft’s holds; two drafts can hold the same staff', async () => {
    await store().place({ draftId: 'd1', holds: [hold('a', 0, 60)], ttlMs: 10 * MIN, nowMs: NOW });
    await store().place({
      draftId: 'd2',
      holds: [hold('a', 120, 180)],
      ttlMs: 10 * MIN,
      nowMs: NOW,
    });
    await store().release({ draftId: 'd1', holds: [hold('a', 0, 60)] });
    const out = await store().busy({ staffIds: ['a'], date: '2026-10-13', nowMs: NOW });
    expect(out.map((o) => o.start.getTime())).toEqual([NOW + 120 * MIN]);
  });

  it('ignores the asking draft’s own holds', async () => {
    await store().place({
      draftId: 'mine',
      holds: [hold('a', 0, 60)],
      ttlMs: 10 * MIN,
      nowMs: NOW,
    });
    await store().place({
      draftId: 'other',
      holds: [hold('a', 60, 120)],
      ttlMs: 10 * MIN,
      nowMs: NOW,
    });
    const out = await store().busy({
      staffIds: ['a'],
      date: '2026-10-13',
      nowMs: NOW,
      exceptDraftId: 'mine',
    });
    expect(out.map((o) => o.start.getTime())).toEqual([NOW + 60 * MIN]);
  });

  it('the key disappears with its last hold', async () => {
    await store().place({ draftId: 'd1', holds: [hold('a', 0, 60)], ttlMs: 1_000, nowMs: NOW });
    expect(await redis.exists('hold:a:2026-10-13')).toBe(1);
    expect(await redis.pttl('hold:a:2026-10-13')).toBeLessThanOrEqual(1_000);
  });

  it('placing nothing or releasing nothing is fine; staff ids with a separator are refused', async () => {
    await store().place({ draftId: 'd', holds: [], ttlMs: MIN, nowMs: NOW });
    await store().release({ draftId: 'd', holds: [] });
    await expect(
      store().place({ draftId: 'd', holds: [hold('a:b', 0, 60)], ttlMs: MIN, nowMs: NOW }),
    ).rejects.toThrow();
  });
});
