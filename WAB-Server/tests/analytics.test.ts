import { Types } from 'mongoose';
import request from 'supertest';
import type { Redis } from 'ioredis';
import { createApp } from '../src/app';
import { createAnalyticsService } from '../src/domain/analytics/analytics.service';
import { createSettingsService, type SettingsStore } from '../src/domain/settings';
import { requireAuth } from '../src/middlewares/auth';
import { createMongoAnalytics } from '../src/providers/analytics';
import { ServerEventsRepository } from '../src/repositories/serverEvents.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const store: SettingsStore = {
  findAllEntries: () => Promise.resolve([]),
  upsert: () => Promise.resolve(),
};
const FROM = '2026-10-01T00:00:00.000Z';
const TO = '2026-10-08T00:00:00.000Z';
let testRedis: TestRedis;
let redis: Redis;
let app: ReturnType<typeof createApp>;
let calls: Record<string, unknown>[] = [];
let failCounter = false;
let tracked: Record<string, unknown>[] = [];

const token = (type: 'ADMIN' | 'CUSTOMER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: new Types.ObjectId().toHexString(), ttlSec: 600 }).token}`;
interface Body {
  data: unknown;
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  const analytics = createMongoAnalytics({
    events: {
      track: (event) => {
        tracked.push(event);
        return Promise.resolve(true);
      },
    },
    counter: {
      countGrouped: (query) => {
        calls.push({ ...query });
        if (failCounter) return Promise.reject(new Error('mongo down'));
        return Promise.resolve([
          { key: 'payment.failed', count: 3 },
          { key: 'booking.created', count: 10 },
        ]);
      },
    },
  });
  app = createApp({
    logger,
    services: {
      adminGuard: requireAuth('admin', SECRET),
      adminAnalytics: createAnalyticsService({
        analytics,
        settings: createSettingsService({ store, redis, logger }),
        redis,
        logger,
      }),
    },
  });
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});
beforeEach(async () => {
  calls = [];
  tracked = [];
  failCounter = false;
  await redis.flushdb();
});

const get = (path: string, auth = token()): request.Test =>
  request(app).get(`/admin/v1/analytics${path}`).set('Authorization', auth);

describe('admin analytics', () => {
  it('needs an admin token', async () => {
    expect(
      (await request(app).get(`/admin/v1/analytics/overview?from=${FROM}&to=${TO}`)).status,
    ).toBe(401);
    expect((await get(`/overview?from=${FROM}&to=${TO}`, token('CUSTOMER'))).status).toBe(403);
  });

  it('overview groups known events by section and fills zeros', async () => {
    const res = await get(`/overview?from=${FROM}&to=${TO}`);
    expect(res.status).toBe(200);
    const data = bodyOf(res).data as Record<string, Record<string, number>>;
    expect(data.payments?.['payment.failed']).toBe(3);
    expect(data.payments?.['payment.succeeded']).toBe(0);
    expect(data.bookings?.['booking.created']).toBe(10);
    expect(data.errors?.['api.error']).toBe(0);
    expect(calls[0]?.timeZone).toBe('Asia/Amman');
    expect(calls[0]?.groupBy).toBe('NAME');
  });

  it('caches an identical question and asks again for a different one', async () => {
    await get(`/overview?from=${FROM}&to=${TO}`);
    await get(`/overview?from=${FROM}&to=${TO}`);
    expect(calls).toHaveLength(1);
    await get(`/overview?from=${FROM}&to=2026-10-09T00:00:00.000Z`);
    expect(calls).toHaveLength(2);
  });

  it('events: grouping, names filter (order-insensitive cache)', async () => {
    const res = await get(`/events?from=${FROM}&to=${TO}&groupBy=DAY&names=b.x,a.y`);
    expect(res.status).toBe(200);
    expect(calls[0]?.groupBy).toBe('DAY');
    expect(calls[0]?.names).toEqual(['a.y', 'b.x']);
    await get(`/events?from=${FROM}&to=${TO}&groupBy=DAY&names=a.y,b.x`);
    expect(calls).toHaveLength(1);
  });

  it('rejects bad input without querying', async () => {
    for (const q of [
      `/overview?from=${TO}&to=${FROM}`,
      `/overview?from=2026-01-01T00:00:00.000Z&to=2026-10-01T00:00:00.000Z`,
      `/overview?from=nope&to=${TO}`,
      `/events?from=${FROM}&to=${TO}&groupBy=HOUR`,
      `/events?from=${FROM}&to=${TO}&names=Bad Name`,
    ]) {
      expect((await get(q)).status).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it('a failing store is a 502, not cached', async () => {
    failCounter = true;
    expect((await get(`/overview?from=${FROM}&to=${TO}`)).status).toBe(502);
    failCounter = false;
    expect((await get(`/overview?from=${FROM}&to=${TO}`)).status).toBe(200);
  });

  it('still answers when the cache is down', async () => {
    const broken = new Proxy(redis, {
      get: (target, prop) =>
        prop === 'get' || prop === 'set'
          ? () => Promise.reject(new Error('redis down'))
          : (target as never)[prop],
    });
    const service = createAnalyticsService({
      analytics: createMongoAnalytics({
        events: { track: () => Promise.resolve(true) },
        counter: { countGrouped: () => Promise.resolve([{ key: 'booking.created', count: 1 }]) },
      }),
      settings: createSettingsService({ store, redis, logger }),
      redis: broken,
      logger,
    });
    const out = await service.overview({ from: new Date(FROM), to: new Date(TO) });
    expect(out.bookings['booking.created']).toBe(1);
  });
});

describe('mongo analytics provider', () => {
  const make = (): ReturnType<typeof createMongoAnalytics> =>
    createMongoAnalytics({
      events: {
        track: (event) => {
          tracked.push(event);
          return Promise.resolve(true);
        },
      },
      counter: { countGrouped: () => Promise.resolve([]) },
    });

  it('links an identity as an event', async () => {
    const actorId = new Types.ObjectId().toHexString();
    await make().linkIdentity({ installationId: 'abc123', actorType: 'CUSTOMER', actorId });
    expect(tracked[0]).toMatchObject({ name: 'identity.linked', actorId });
  });

  it('refuses a bad range or zone', async () => {
    const base = { groupBy: 'NAME' as const, timeZone: 'Asia/Amman' };
    await expect(
      make().countEvents({ ...base, from: new Date(TO), to: new Date(FROM) }),
    ).rejects.toThrow(RangeError);
    await expect(
      make().countEvents({
        ...base,
        timeZone: 'Nope/Zone',
        from: new Date(FROM),
        to: new Date(TO),
      }),
    ).rejects.toThrow(RangeError);
  });
});

describe('server events repository countGrouped', () => {
  it('builds the right pipeline for names and days', async () => {
    const pipelines: unknown[][] = [];
    const model = {
      aggregate: (pipeline: unknown[]) => {
        pipelines.push(pipeline);
        return { exec: () => Promise.resolve([{ _id: '2026-10-01', count: 2 }]) };
      },
    };
    const repo = new ServerEventsRepository(model as never);
    const rows = await repo.countGrouped({
      from: new Date(FROM),
      to: new Date(TO),
      groupBy: 'DAY',
      timeZone: 'Asia/Amman',
      names: ['a.b'],
    });
    expect(rows).toEqual([{ key: '2026-10-01', count: 2 }]);
    const json = JSON.stringify(pipelines[0]);
    expect(json).toContain('"timezone":"Asia/Amman"');
    expect(json).toContain('"$in":["a.b"]');
    await repo.countGrouped({
      from: new Date(FROM),
      to: new Date(TO),
      groupBy: 'NAME',
      timeZone: 'Asia/Amman',
    });
    expect(JSON.stringify(pipelines[1])).not.toContain('$in');
  });
});
