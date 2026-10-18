import { Types } from 'mongoose';
import type { Redis } from 'ioredis';
import { AnalyticsError, ERROR_CODES, type Analytics, type AnalyticsOptions } from '@wab/analytics';
import type { AnalyticsSettings, AppConfig } from '../src/config';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import {
  buildAnalyticsOptions,
  createRealAnalytics,
  mapAnalyticsError,
  objectIdCodec,
  toCacheRedis,
  type CollectionSource,
  type RealAnalyticsDeps,
} from '../src/providers/analytics/real';
import { ExternalServiceError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';

const logger = createLogger({ level: 'silent' });
const OBJECT_ID = 'a1b2c3d4e5f60718293a4b5c';

type Doc = Record<string, unknown>;

/** Collection stand-in that records writes and answers the aggregate used by `countEvents`. */
class FakeCollection {
  readonly inserted: Doc[] = [];
  readonly updated: Doc[][] = [];
  readonly indexes: Doc[] = [];
  failIndexes = false;
  insertOne(doc: Doc): Promise<unknown> {
    this.inserted.push(doc);
    return Promise.resolve({});
  }
  updateOne(filter: Doc, update: Doc, options?: Doc): Promise<unknown> {
    this.updated.push([filter, update, options ?? {}]);
    return Promise.resolve({});
  }
  find(): { sort: () => unknown; limit: () => unknown; toArray: () => Promise<Doc[]> } {
    const cursor = { sort: () => cursor, limit: () => cursor, toArray: () => Promise.resolve([]) };
    return cursor;
  }
  aggregate(): { toArray: () => Promise<Doc[]> } {
    return { toArray: () => Promise.resolve([{ _id: 'booking.created', count: 3 }]) };
  }
  createIndex(spec: Doc): Promise<unknown> {
    if (this.failIndexes) return Promise.reject(new Error('index failure'));
    this.indexes.push(spec);
    return Promise.resolve('ok');
  }
}

const source = (): { mongo: CollectionSource; collections: Map<string, FakeCollection> } => {
  const collections = new Map<string, FakeCollection>();
  return {
    collections,
    mongo: {
      collection: (name) => {
        const known = collections.get(name) ?? new FakeCollection();
        collections.set(name, known);
        return known;
      },
    },
  };
};

const redisCalls: unknown[][] = [];
const redis = {
  get: (key: string) => Promise.resolve(key === 'hit' ? 'value' : null),
  set: (...args: unknown[]) => {
    redisCalls.push(args);
    return Promise.resolve('OK');
  },
} as unknown as Redis;

const deps = (
  settings: AnalyticsSettings = {},
  isProduction = false,
): RealAnalyticsDeps & ReturnType<typeof source> => ({
  settings,
  redis,
  logger,
  isProduction,
  ...source(),
});

const stub = (overrides: Partial<Analytics> = {}): Analytics => ({
  track: () => Promise.resolve(true),
  linkIdentity: () => Promise.resolve(),
  countEvents: () => Promise.resolve([]),
  funnel: () => Promise.reject(new Error('unused')),
  cohorts: () => Promise.reject(new Error('unused')),
  journey: () => Promise.reject(new Error('unused')),
  overview: () => Promise.reject(new Error('unused')),
  init: () => Promise.resolve(),
  close: () => Promise.resolve(),
  ...overrides,
});

const sdkError = (
  code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
  retryable = false,
): AnalyticsError => new AnalyticsError(code, 'boom', { retryable });

describe('objectIdCodec and cache adapter', () => {
  it('stores 24-hex ids as ObjectId and keeps other ids as text', () => {
    const encoded = objectIdCodec.encode(OBJECT_ID);
    expect(encoded).toBeInstanceOf(Types.ObjectId);
    expect(objectIdCodec.encode('guest-1')).toBe('guest-1');
    expect(objectIdCodec.decode(encoded)).toBe(OBJECT_ID);
  });

  it('forwards get and set-with-expiry to Redis', async () => {
    redisCalls.length = 0;
    const cache = toCacheRedis(redis);
    expect(await cache.get('hit')).toBe('value');
    expect(await cache.get('miss')).toBeNull();
    await cache.set('k', 'v', 'EX', 60);
    expect(redisCalls).toEqual([['k', 'v', 'EX', 60]]);
  });
});

describe('buildAnalyticsOptions', () => {
  it('reads the server events and identity collections with the Redis cache', () => {
    const d = deps();
    const options = buildAnalyticsOptions(d);
    expect(options).toMatchObject({
      environment: 'dev',
      provider: 'mongo',
      cache: { store: 'redis', ttlSec: 60 },
    });
    expect([...d.collections.keys()].sort()).toEqual(['identityLinks', 'serverEvents']);
    expect(options.warehouse).toBeUndefined();
    expect(buildAnalyticsOptions({ ...d, isProduction: true }).environment).toBe('prod');
  });

  it('adds BigQuery with only the values that are set', () => {
    const full = buildAnalyticsOptions(
      deps({
        bigquery: {
          projectId: 'wab-prod',
          dataset: 'analytics_1',
          location: 'EU',
          credentialsJson: '{"a":1}',
          crashTable: 'com_wab_ANDROID',
          maxBytesBilled: 5_000,
        },
      }),
    );
    expect(full.warehouse).toEqual({
      provider: 'bigquery',
      bigquery: {
        projectId: 'wab-prod',
        dataset: 'analytics_1',
        location: 'EU',
        credentials: '{"a":1}',
        crashTable: 'com_wab_ANDROID',
      },
    });
    expect(full.limits).toEqual({ maxBytesBilled: 5_000 });
    const minimal = buildAnalyticsOptions(deps({ bigquery: { projectId: 'p-1', dataset: 'd' } }));
    expect(minimal.warehouse).toEqual({
      provider: 'bigquery',
      bigquery: { projectId: 'p-1', dataset: 'd' },
    });
    expect(minimal.limits).toBeUndefined();
  });
});

describe('mapAnalyticsError', () => {
  it.each([
    ERROR_CODES.CONFIG_INVALID,
    ERROR_CODES.VALIDATION_FAILED,
    ERROR_CODES.ANALYTICS_EVENT_INVALID,
    ERROR_CODES.ANALYTICS_RANGE_INVALID,
  ])('%s is a caller bug (RangeError)', (code) => {
    expect(() => mapAnalyticsError(sdkError(code))).toThrow(RangeError);
  });

  it.each([
    [ERROR_CODES.ANALYTICS_UNAVAILABLE, true],
    [ERROR_CODES.ANALYTICS_QUERY_TOO_EXPENSIVE, false],
    [ERROR_CODES.AUTH_FAILED, false],
    [ERROR_CODES.UNKNOWN, false],
  ])('%s becomes a provider error (unavailable=%s)', (code, retryable) => {
    try {
      mapAnalyticsError(sdkError(code, retryable));
      throw new Error('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ExternalServiceError);
      expect((error as ExternalServiceError).cause).toBeInstanceOf(AnalyticsError);
    }
  });

  it('rethrows foreign errors untouched', () => {
    const foreign = new Error('x');
    expect(() => mapAnalyticsError(foreign)).toThrow(foreign);
  });
});

describe('createRealAnalytics with a stubbed SDK', () => {
  it('passes events without undefined keys and exposes the SDK', async () => {
    const seen: unknown[] = [];
    const sdk = stub({
      track: (event) => {
        seen.push(event);
        return Promise.resolve(true);
      },
    });
    const real = createRealAnalytics({ ...deps(), build: () => sdk });
    expect(real.sdk).toBe(sdk);
    expect(
      await real.track({ name: 'a.b', actorType: 'CUSTOMER', actorId: undefined, params: {} }),
    ).toBe(true);
    expect(seen).toEqual([{ name: 'a.b', actorType: 'CUSTOMER', params: {} }]);
  });

  it('maps link and count failures and passes results through', async () => {
    const unavailable = createRealAnalytics({
      ...deps(),
      build: () =>
        stub({
          linkIdentity: () => Promise.reject(sdkError(ERROR_CODES.ANALYTICS_EVENT_INVALID)),
          countEvents: () => Promise.reject(sdkError(ERROR_CODES.ANALYTICS_UNAVAILABLE, true)),
        }),
    });
    const link = {
      installationId: 'inst-0001',
      actorType: 'CUSTOMER',
      actorId: OBJECT_ID,
    } as const;
    await expect(unavailable.linkIdentity(link)).rejects.toBeInstanceOf(RangeError);
    const query = {
      from: new Date(0),
      to: new Date(1000),
      groupBy: 'NAME',
      timeZone: 'UTC',
    } as const;
    await expect(unavailable.countEvents(query)).rejects.toBeInstanceOf(ExternalServiceError);

    const ok = createRealAnalytics({
      ...deps(),
      build: () => stub({ countEvents: () => Promise.resolve([{ key: 'a.b', count: 2 }]) }),
    });
    await expect(ok.linkIdentity(link)).resolves.toBeUndefined();
    expect(await ok.countEvents(query)).toEqual([{ key: 'a.b', count: 2 }]);
  });

  it('logs a failed index creation instead of stopping, and closes the SDK', async () => {
    let closed = false;
    const real = createRealAnalytics({
      ...deps(),
      build: () =>
        stub({
          init: () => Promise.reject(new Error('no rights')),
          close: () => {
            closed = true;
            return Promise.resolve();
          },
        }),
    });
    await new Promise((resolve) => setImmediate(resolve));
    await real.close();
    expect(closed).toBe(true);
  });
});

describe('createRealAnalytics with the real SDK over fake collections', () => {
  it('writes the server-event layout, links identities and counts', async () => {
    const d = deps();
    const real = createRealAnalytics(d);
    await real.sdk.init();
    expect(
      await real.track({
        name: 'booking.created',
        actorType: 'CUSTOMER',
        actorId: OBJECT_ID,
        bookingId: OBJECT_ID,
        params: { code: '00', password: 'secret' },
      }),
    ).toBe(true);
    const events = d.collections.get('serverEvents');
    const doc = events?.inserted[0];
    expect(doc?.actorId).toBeInstanceOf(Types.ObjectId);
    expect(doc?.params).toEqual({ code: '00', password: '[redacted]' });
    expect(Object.keys(doc ?? {}).sort()).toEqual(
      ['actorId', 'actorType', 'bookingId', 'name', 'params', 'ts'].sort(),
    );
    expect(await real.track({ name: 'BAD NAME', actorType: 'CUSTOMER' })).toBe(false);

    await real.linkIdentity({
      installationId: 'inst-0001',
      actorType: 'CUSTOMER',
      actorId: OBJECT_ID,
    });
    expect(d.collections.get('identityLinks')?.updated).toHaveLength(1);
    expect(events?.inserted.map((e) => e.name)).toEqual(['booking.created', 'identity.linked']);

    const rows = await real.countEvents({
      from: new Date('2026-03-01T00:00:00Z'),
      to: new Date('2026-03-02T00:00:00Z'),
      groupBy: 'NAME',
      timeZone: 'Asia/Amman',
    });
    expect(rows).toEqual([{ key: 'booking.created', count: 3 }]);
    await expect(
      real.countEvents({ from: new Date(1), to: new Date(0), groupBy: 'NAME', timeZone: 'UTC' }),
    ).rejects.toBeInstanceOf(RangeError);
    await real.close();
  });
});

describe('createProviders with analytics real', () => {
  const modes = {
    otp: 'fake',
    storage: 'fake',
    notifier: 'fake',
    payments: 'fake',
    analytics: 'real',
  } as const;
  const config = { analytics: {} } as unknown as AppConfig;

  it('builds the SDK provider and closes it on shutdown', async () => {
    const d = source();
    const providers = createProviders(modes, false, { redis, logger, config, mongo: d.mongo });
    expect(typeof (providers.analytics as { sdk?: unknown }).sdk).toBe('object');
    await providers.close();
  });

  it('fails loudly without a database connection or runtime dependencies', () => {
    expect(() => createProviders(modes, false, { redis, logger, config })).toThrow(
      ProviderUnavailableError,
    );
    expect(() => createProviders(modes, false)).toThrow(ProviderUnavailableError);
  });
});

export type { AnalyticsOptions };
