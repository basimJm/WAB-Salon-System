import { Redis } from 'ioredis';
import { SETTING_DEFAULTS, SETTINGS_REDIS_RETRY_MS } from '../src/constants/settings';
import {
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  createSettingsService,
  isSettingKey,
  type SettingsService,
  type SettingsStore,
  type StoredSetting,
} from '../src/domain/settings';
import { ValidationError } from '../src/utils/errors';
import type { Logger } from '../src/utils/logger';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { startTestRedis, type TestRedis } from './helpers/redis';

/** BUSINESS_DOMAIN.md §10, copied by hand: the registry must match it key for key. */
const DOMAIN_SETTINGS: Readonly<Record<string, unknown>> = {
  timezone: 'Asia/Amman',
  currency: 'JOD',
  'discovery.nearbyRadiusKm': 10,
  'salon.maxBranches': 20,
  'booking.slotMinutes': 15,
  'booking.maxDaysAhead': 90,
  'booking.maxCompanions': 5,
  'booking.minLeadMinutes': 0,
  'booking.paymentHoldMinutes': 10,
  'booking.autoCancelAfterStartMinutes': 60,
  'booking.pendingAlertBeforeMinutes': 30,
  'booking.reminderMinutes': [60, 15],
  'otp.length': 6,
  'otp.resendAfterSec': 60,
  'otp.maxRequests': 5,
  'otp.requestWindowSec': 300,
  'otp.maxWrong': 5,
  'otp.blockSec': 900,
  'otp.codeTtlSec': 300,
  'otp.proofTtlSec': 600,
  'otp.channel': 'WHATSAPP',
  'auth.accessTokenTtlSec': 900,
  'auth.refreshTokenTtlDays': 90,
  'admin.maxFailedLogins': 5,
  'admin.lockSec': 900,
  'admin.sessionIdleSec': 172_800,
  'account.deletionGraceDays': 30,
  'subscription.trialDays': 90,
  'subscription.warnDaysBefore': 7,
  'refund.maxRetries': 5,
  'refund.delayAlertHours': 48,
  'reviews.maxPendingPerTargetPerCustomer': 1,
  'pagination.appPageSize': 10,
  'pagination.adminPageSize': 25,
  'uploads.imageMaxMb': 10,
  'uploads.videoMaxMb': 50,
  'uploads.videoMaxSec': 60,
  'uploads.docMaxMb': 10,
  'uploads.docMaxFiles': 5,
  'alerts.paymentFailures': { count: 5, windowMin: 15, ratePct: 20, rateWindowMin: 60 },
  'alerts.api5xxRatePct': 2,
  'alerts.crashesPerHour': 10,
};

const valid = (key: keyof typeof SETTING_DEFINITIONS, value: unknown): boolean =>
  SETTING_DEFINITIONS[key].schema.safeParse(value).success;

describe('settings registry', () => {
  it('has exactly the 42 keys of BUSINESS_DOMAIN.md §10', () => {
    expect([...SETTING_KEYS].sort()).toEqual(Object.keys(DOMAIN_SETTINGS).sort());
    expect(SETTING_KEYS).toHaveLength(42);
    expect(Object.keys(SETTING_DEFAULTS).sort()).toEqual([...SETTING_KEYS].sort());
  });

  it.each(Object.entries(DOMAIN_SETTINGS))('defaults %s to the domain value', (key, expected) => {
    if (!isSettingKey(key)) throw new Error(`${key} is not a setting`);
    expect(SETTING_DEFINITIONS[key].default).toEqual(expected);
    expect(SETTING_DEFINITIONS[key].schema.safeParse(expected).success).toBe(true);
  });

  it('hands out read-only defaults', () => {
    expect(Object.isFrozen(SETTING_DEFINITIONS['booking.reminderMinutes'].default)).toBe(true);
    expect(Object.isFrozen(SETTING_DEFINITIONS['alerts.paymentFailures'].default)).toBe(true);
  });

  it('knows its keys and nothing inherited from Object', () => {
    expect(isSettingKey('booking.slotMinutes')).toBe(true);
    for (const notAKey of [
      'toString',
      '__proto__',
      'constructor',
      'hasOwnProperty',
      '',
      'booking',
      5,
      null,
    ]) {
      expect(isSettingKey(notAKey)).toBe(false);
    }
  });

  it.each([
    ['booking.slotMinutes', 15, true],
    ['booking.slotMinutes', 1, true],
    ['booking.slotMinutes', 0, false],
    ['booking.slotMinutes', -5, false],
    ['booking.slotMinutes', 1.5, false],
    ['booking.slotMinutes', '15', false],
    ['booking.slotMinutes', NaN, false],
    ['booking.slotMinutes', Infinity, false],
    ['booking.slotMinutes', null, false],
    ['booking.slotMinutes', true, false],
    ['booking.minLeadMinutes', 0, true],
    ['booking.minLeadMinutes', -1, false],
    ['booking.maxCompanions', 0, true],
    ['salon.maxBranches', 1, true],
    ['salon.maxBranches', 0, false],
    ['subscription.trialDays', 0, true],
    ['refund.maxRetries', 0, true],
    ['account.deletionGraceDays', 0, false],
    ['discovery.nearbyRadiusKm', 2.5, true],
    ['discovery.nearbyRadiusKm', 0, false],
    ['discovery.nearbyRadiusKm', -1, false],
    ['discovery.nearbyRadiusKm', NaN, false],
    ['otp.length', 4, true],
    ['otp.length', 6, true],
    ['otp.length', 10, true],
    ['otp.length', 3, false],
    ['otp.length', 11, false],
    ['otp.length', 6.5, false],
    ['otp.channel', 'WHATSAPP', true],
    ['otp.channel', 'SMS', false],
    ['otp.channel', 'whatsapp', false],
    ['pagination.appPageSize', 1, true],
    ['pagination.appPageSize', 100, true],
    ['pagination.adminPageSize', 101, false],
    ['pagination.adminPageSize', 0, false],
    ['alerts.api5xxRatePct', 2, true],
    ['alerts.api5xxRatePct', 0.5, true],
    ['alerts.api5xxRatePct', 100, true],
    ['alerts.api5xxRatePct', 0, false],
    ['alerts.api5xxRatePct', 101, false],
    ['timezone', 'Asia/Amman', true],
    ['timezone', 'UTC', true],
    ['timezone', 'Mars/Base', false],
    ['timezone', '', false],
    ['timezone', 3, false],
    ['currency', 'JOD', true],
    ['currency', 'USD', false],
    ['currency', 'jod', false],
  ] as const)('%s accepts %p: %p', (key, value, expected) => {
    expect(valid(key, value)).toBe(expected);
  });

  // Every key belongs to one kind, and each kind is tested on every key in it, so a wrong rule on
  // any single key (say 0 allowed where it must not be) is caught.
  const POSITIVE_INT_KEYS = [
    'booking.slotMinutes',
    'booking.maxDaysAhead',
    'booking.paymentHoldMinutes',
    'booking.autoCancelAfterStartMinutes',
    'booking.pendingAlertBeforeMinutes',
    'otp.resendAfterSec',
    'otp.maxRequests',
    'otp.requestWindowSec',
    'otp.maxWrong',
    'otp.blockSec',
    'otp.codeTtlSec',
    'otp.proofTtlSec',
    'auth.accessTokenTtlSec',
    'auth.refreshTokenTtlDays',
    'admin.maxFailedLogins',
    'admin.lockSec',
    'admin.sessionIdleSec',
    'account.deletionGraceDays',
    'subscription.warnDaysBefore',
    'refund.delayAlertHours',
    'reviews.maxPendingPerTargetPerCustomer',
    'uploads.imageMaxMb',
    'uploads.videoMaxMb',
    'uploads.videoMaxSec',
    'uploads.docMaxMb',
    'uploads.docMaxFiles',
    'alerts.crashesPerHour',
    'salon.maxBranches',
  ] as const;
  const NON_NEGATIVE_INT_KEYS = [
    'booking.maxCompanions',
    'booking.minLeadMinutes',
    'subscription.trialDays',
    'refund.maxRetries',
  ] as const;
  const PAGE_SIZE_KEYS = ['pagination.appPageSize', 'pagination.adminPageSize'] as const;
  const TESTED_ONE_BY_ONE = [
    'timezone',
    'currency',
    'discovery.nearbyRadiusKm',
    'otp.length',
    'otp.channel',
    'booking.reminderMinutes',
    'alerts.paymentFailures',
    'alerts.api5xxRatePct',
  ] as const;
  const NOT_NUMBERS = ['1', '', NaN, Infinity, -Infinity, null, undefined, true, [], {}, [1]];

  it('assigns every key to exactly one kind, so none is left untested', () => {
    const assigned = [
      ...POSITIVE_INT_KEYS,
      ...NON_NEGATIVE_INT_KEYS,
      ...PAGE_SIZE_KEYS,
      ...TESTED_ONE_BY_ONE,
    ];
    expect([...assigned].sort()).toEqual([...SETTING_KEYS].sort());
  });

  describe.each(POSITIVE_INT_KEYS)('%s is a positive whole number', (key) => {
    it('accepts 1 and large values, rejects zero, negatives, fractions and non-numbers', () => {
      for (const ok of [1, 2, 1_000_000]) expect(valid(key, ok)).toBe(true);
      for (const bad of [0, -0.5, -1, 0.5, 1.5, ...NOT_NUMBERS])
        expect(valid(key, bad)).toBe(false);
    });
  });

  describe.each(NON_NEGATIVE_INT_KEYS)('%s is a whole number from zero', (key) => {
    it('accepts 0, 1 and large values, rejects negatives, fractions and non-numbers', () => {
      for (const ok of [0, 1, 1_000_000]) expect(valid(key, ok)).toBe(true);
      for (const bad of [-1, -0.5, 0.5, 1.5, ...NOT_NUMBERS]) expect(valid(key, bad)).toBe(false);
    });
  });

  describe.each(PAGE_SIZE_KEYS)('%s is a page size', (key) => {
    it('accepts 1 to the maximum page size, rejects 0, anything above and non-numbers', () => {
      for (const ok of [1, 10, 25, 100]) expect(valid(key, ok)).toBe(true);
      for (const bad of [0, -1, 101, 1_000, 1.5, ...NOT_NUMBERS])
        expect(valid(key, bad)).toBe(false);
    });
  });

  it('accepts reminder offsets that are a short list of distinct positive whole minutes', () => {
    const key = 'booking.reminderMinutes';
    expect(valid(key, [60, 15])).toBe(true);
    expect(valid(key, [])).toBe(true);
    expect(valid(key, [5])).toBe(true);
    expect(
      valid(
        key,
        Array.from({ length: 10 }, (_, i) => i + 1),
      ),
    ).toBe(true);
    expect(
      valid(
        key,
        Array.from({ length: 11 }, (_, i) => i + 1),
      ),
    ).toBe(false);
    expect(valid(key, [15, 15])).toBe(false);
    expect(valid(key, [0])).toBe(false);
    expect(valid(key, [-1])).toBe(false);
    expect(valid(key, [1.5])).toBe(false);
    expect(valid(key, '60,15')).toBe(false);
  });

  it('accepts the payment-failure alert only with exactly its four valid fields', () => {
    const key = 'alerts.paymentFailures';
    const ok = { count: 5, windowMin: 15, ratePct: 20, rateWindowMin: 60 };
    expect(valid(key, ok)).toBe(true);
    expect(valid(key, { ...ok, ratePct: 12.5 })).toBe(true);
    expect(valid(key, { ...ok, count: 0 })).toBe(false);
    expect(valid(key, { ...ok, ratePct: 0 })).toBe(false);
    expect(valid(key, { ...ok, ratePct: 100.5 })).toBe(false);
    expect(valid(key, { ...ok, extra: 1 })).toBe(false);
    expect(valid(key, { count: 5, windowMin: 15, ratePct: 20 })).toBe(false);
    expect(valid(key, 5)).toBe(false);
  });
});

/** An in-memory stand-in for `SettingsRepository`. */
class MemoryStore implements SettingsStore {
  readonly rows = new Map<string, unknown>();
  reads = 0;
  writes = 0;

  findAllEntries(): Promise<readonly StoredSetting[]> {
    this.reads += 1;
    return Promise.resolve(
      [...this.rows].map(([key, value]) => ({ key, value: structuredClone(value) })),
    );
  }

  upsert(key: string, value: unknown): Promise<unknown> {
    this.writes += 1;
    this.rows.set(key, value);
    return Promise.resolve(undefined);
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

let testRedis: TestRedis;
let redis: Redis;

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

const OVERRIDES_KEY = 'settings:overrides';
const VERSION_KEY = 'settings:version';

const makeService = (
  store: SettingsStore,
  options: { redis?: Redis; now?: () => number; cacheTtlSec?: number } = {},
): { service: SettingsService; warn: jest.Mock; error: jest.Mock } => {
  const warn = jest.fn();
  const error = jest.fn();
  const logger = { warn, error } as unknown as Logger;
  const service = createSettingsService({
    store,
    redis: options.redis ?? redis,
    logger,
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.cacheTtlSec === undefined ? {} : { cacheTtlSec: options.cacheTtlSec }),
  });
  return { service, warn, error };
};

describe('settings service: values', () => {
  it('returns the default of every key when nothing is stored', async () => {
    const { service } = makeService(new MemoryStore());
    const snapshot = await service.snapshot();
    for (const key of SETTING_KEYS) expect(snapshot[key]).toEqual(DOMAIN_SETTINGS[key]);
    expect(await service.get('booking.slotMinutes')).toBe(15);
    expect(await service.get('timezone')).toBe('Asia/Amman');
  });

  it('uses a stored value in place of the default, leaving the other keys alone', async () => {
    const store = new MemoryStore();
    store.rows.set('booking.slotMinutes', 30);
    store.rows.set('alerts.paymentFailures', {
      count: 3,
      windowMin: 10,
      ratePct: 12.5,
      rateWindowMin: 30,
    });
    const { service } = makeService(store);
    expect(await service.get('booking.slotMinutes')).toBe(30);
    expect(await service.get('alerts.paymentFailures')).toEqual({
      count: 3,
      windowMin: 10,
      ratePct: 12.5,
      rateWindowMin: 30,
    });
    expect(await service.get('booking.maxDaysAhead')).toBe(90);
  });

  it('returns read-only values, so a caller cannot change what others will read', async () => {
    const { service } = makeService(new MemoryStore());
    const snapshot = await service.snapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
    const reminders = snapshot['booking.reminderMinutes'] as number[];
    expect(Object.isFrozen(reminders)).toBe(true);
    expect(() => reminders.push(5)).toThrow(TypeError);
    expect(Object.isFrozen(snapshot['alerts.paymentFailures'])).toBe(true);
    expect(await service.get('booking.reminderMinutes')).toEqual([60, 15]);
  });

  it('keeps working when the database holds a value that is invalid or for an unknown key', async () => {
    const store = new MemoryStore();
    store.rows.set('booking.slotMinutes', 'fifteen');
    store.rows.set('otp.length', 99);
    store.rows.set('removed.long.ago', 1);
    store.rows.set('booking.maxDaysAhead', 120);
    const { service, warn } = makeService(store);
    expect(await service.get('booking.slotMinutes')).toBe(15);
    expect(await service.get('otp.length')).toBe(6);
    expect(await service.get('booking.maxDaysAhead')).toBe(120);
    expect(warn).toHaveBeenCalledWith(
      { key: 'booking.slotMinutes' },
      'ignoring an invalid stored setting, using its default',
    );
    expect(warn).toHaveBeenCalledWith(
      { key: 'otp.length' },
      'ignoring an invalid stored setting, using its default',
    );
    expect(warn).toHaveBeenCalledWith(
      { key: 'removed.long.ago' },
      'ignoring an unknown stored setting',
    );
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe('settings service: set', () => {
  it('validates, saves a plain copy, and returns the read-only value', async () => {
    const store = new MemoryStore();
    const { service } = makeService(store);
    const saved = await service.set('booking.reminderMinutes', [120, 30, 5]);
    expect(saved).toEqual([120, 30, 5]);
    expect(Object.isFrozen(saved)).toBe(true);
    expect(store.rows.get('booking.reminderMinutes')).toEqual([120, 30, 5]);
    expect(Object.isFrozen(store.rows.get('booking.reminderMinutes'))).toBe(false);
    expect(await service.get('booking.reminderMinutes')).toEqual([120, 30, 5]);
  });

  it('rejects a bad value with field details named after the setting, and saves nothing', async () => {
    const store = new MemoryStore();
    const { service } = makeService(store);
    await expect(service.set('booking.slotMinutes', 0)).rejects.toBeInstanceOf(ValidationError);
    await expect(service.set('booking.slotMinutes', 0)).rejects.toMatchObject({
      httpStatus: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'booking.slotMinutes' }],
    });
    await expect(
      service.set('alerts.paymentFailures', {
        count: 5,
        windowMin: 15,
        ratePct: 500,
        rateWindowMin: 60,
      }),
    ).rejects.toMatchObject({ details: [{ field: 'alerts.paymentFailures.ratePct' }] });
    expect(store.writes).toBe(0);
    expect(await service.get('booking.slotMinutes')).toBe(15);
  });

  it('rejects a key that is not a setting', async () => {
    const store = new MemoryStore();
    const { service } = makeService(store);
    for (const key of ['nope', 'toString', '__proto__', '']) {
      await expect(service.set(key as 'timezone', 1)).rejects.toMatchObject({
        httpStatus: 400,
        details: [{ field: 'key' }],
      });
    }
    expect(store.writes).toBe(0);
  });

  it('is visible at once to this instance and to every other instance', async () => {
    const store = new MemoryStore();
    const first = makeService(store).service;
    const second = makeService(store).service;
    expect(await first.get('booking.slotMinutes')).toBe(15);
    expect(await second.get('booking.slotMinutes')).toBe(15);

    await first.set('booking.slotMinutes', 30);

    expect(await first.get('booking.slotMinutes')).toBe(30);
    expect(await second.get('booking.slotMinutes')).toBe(30);
  });

  it('counts every change in the shared version', async () => {
    const { service } = makeService(new MemoryStore());
    await service.set('booking.slotMinutes', 30);
    expect(await redis.get(VERSION_KEY)).toBe('1');
    await service.set('booking.slotMinutes', 20);
    expect(await redis.get(VERSION_KEY)).toBe('2');
  });
});

describe('settings service: cache', () => {
  it('reads the database once, then serves from Redis, for every instance', async () => {
    const store = new MemoryStore();
    const first = makeService(store).service;
    const second = makeService(store).service;
    await first.get('booking.slotMinutes');
    await first.get('otp.length');
    await second.get('booking.maxDaysAhead');
    await second.snapshot();
    expect(store.reads).toBe(1);
    const ttl = await redis.ttl(OVERRIDES_KEY);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('reuses the built snapshot while the cached payload is unchanged', async () => {
    const { service } = makeService(new MemoryStore());
    expect(await service.snapshot()).toBe(await service.snapshot());
  });

  it('reloads after the cache expires', async () => {
    const store = new MemoryStore();
    const { service } = makeService(store);
    await service.get('booking.slotMinutes');
    store.rows.set('booking.slotMinutes', 45); // changed behind the cache's back
    expect(await service.get('booking.slotMinutes')).toBe(15);
    await redis.del(OVERRIDES_KEY); // what the TTL does
    expect(await service.get('booking.slotMinutes')).toBe(45);
    expect(store.reads).toBe(2);
  });

  it('treats a corrupt or foreign cache entry as a miss and repairs it', async () => {
    for (const garbage of ['{not json', '{"a":1}', '[1,2]', '[{"key":5}]', 'null']) {
      await redis.flushdb();
      const store = new MemoryStore();
      store.rows.set('booking.slotMinutes', 30);
      const { service, warn } = makeService(store);
      await redis.set(OVERRIDES_KEY, garbage);
      expect(await service.get('booking.slotMinutes')).toBe(30);
      expect(warn).toHaveBeenCalledWith('ignoring a corrupt settings cache entry');
      expect(JSON.parse((await redis.get(OVERRIDES_KEY)) ?? 'null')).toEqual([
        { key: 'booking.slotMinutes', value: 30 },
      ]);
    }
  });

  it('never lets a read that started before a change write its old data back', async () => {
    const store = new MemoryStore();
    store.rows.set('booking.slotMinutes', 20);
    const reader = makeService(store).service;
    const writer = makeService(store).service;

    // The reader's first database read captures the old rows, then waits at a gate.
    const gate: { open: () => void } = { open: () => undefined };
    const opened = new Promise<void>((resolve) => {
      gate.open = resolve;
    });
    const readRows = store.findAllEntries.bind(store);
    let gated = false;
    store.findAllEntries = async () => {
      const rows = await readRows();
      if (!gated) {
        gated = true;
        await opened;
      }
      return rows;
    };

    const slow = reader.get('booking.slotMinutes');
    while (store.reads === 0) await sleep(5);

    await writer.set('booking.slotMinutes', 30); // saves, moves the version on, drops the cache
    gate.open();

    expect(await slow).toBe(20); // it began before the change, so the old value is fair
    expect(await redis.exists(OVERRIDES_KEY)).toBe(0); // but it must not have been cached
    expect(await reader.get('booking.slotMinutes')).toBe(30);
    expect(await writer.get('booking.slotMinutes')).toBe(30);
  });
});

describe('settings service: Redis unavailable', () => {
  const deadRedis = (): Redis => {
    const dead = new Redis('redis://127.0.0.1:1', {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    dead.on('error', () => undefined);
    return dead;
  };

  it('reads from the database, and stops trying Redis for a while after a failure', async () => {
    const store = new MemoryStore();
    store.rows.set('booking.slotMinutes', 30);
    const dead = deadRedis();
    const getSpy = jest.spyOn(dead, 'get');
    let clock = 10_000;
    const { service, warn } = makeService(store, { redis: dead, now: () => clock });

    expect(await service.get('booking.slotMinutes')).toBe(30);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      { err: expect.any(Error) as unknown },
      'settings cache unavailable, reading the database',
    );

    expect(await service.get('booking.slotMinutes')).toBe(30);
    expect(getSpy).toHaveBeenCalledTimes(1); // Redis skipped during the cool-down
    expect(store.reads).toBe(2);

    clock += SETTINGS_REDIS_RETRY_MS;
    expect(await service.get('booking.slotMinutes')).toBe(30);
    expect(getSpy).toHaveBeenCalledTimes(2); // tried again once the cool-down ended
    dead.disconnect();
  });

  it('still saves a change and says the cache could not be invalidated', async () => {
    const store = new MemoryStore();
    const dead = deadRedis();
    const { service, error } = makeService(store, { redis: dead });
    expect(await service.get('booking.slotMinutes')).toBe(15); // the failed read starts the cool-down
    expect(await service.set('booking.slotMinutes', 30)).toBe(30);
    expect(store.rows.get('booking.slotMinutes')).toBe(30);
    expect(await service.get('booking.slotMinutes')).toBe(30);
    expect(error).toHaveBeenCalledWith(
      'settings cache not invalidated: Redis is unavailable, other instances may serve old values until it expires',
    );
    dead.disconnect();
  });

  it('reports a failed invalidation but keeps the saved value', async () => {
    const store = new MemoryStore();
    const dead = deadRedis();
    const { service, error } = makeService(store, { redis: dead });
    // No read first, so the failure happens inside the invalidation itself.
    expect(await service.set('booking.slotMinutes', 30)).toBe(30);
    expect(store.rows.get('booking.slotMinutes')).toBe(30);
    expect(error).toHaveBeenCalledWith(
      { err: expect.any(Error) as unknown },
      'settings cache not invalidated, old values may be served until it expires',
    );
    dead.disconnect();
  });
});
