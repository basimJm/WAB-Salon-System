import { generateKeyPairSync } from 'node:crypto';
import type { Redis } from 'ioredis';
import { NotificationError, ERROR_CODES, type NotifierOptions } from 'wab-notifications';
import type { NotifierSettings } from '../src/config';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import {
  createRealNotifier,
  mapSdkError,
  toRedisLike,
  toSdkLogger,
  type ClosableNotifier,
} from '../src/providers/notifier/real';
import { ExternalServiceError } from '../src/utils/errors';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createLogger } from '../src/utils/logger';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const SETTINGS: NotifierSettings = {
  fcm: { serviceAccountJson: '{"project_id":"p"}', projectId: 'p', dryRun: true },
  smtp: { host: 'smtp.example.test', port: 587, secure: false, user: 'u@example.test', pass: 'pw' },
  from: { address: 'noreply@example.test', name: 'WAB' },
};
const PUSH = {
  target: { tokens: ['t1'] },
  message: { app: 'CUSTOMER', kind: 'VISIBLE', title: 'hi', body: 'there' },
  idempotencyKey: 'push:abcdefgh',
} as const;
const EMAIL = {
  to: ['a@example.test'],
  subject: 's',
  text: 't',
  idempotencyKey: 'mail:abcdefgh',
} as const;

let testRedis: TestRedis;
let redis: Redis;
beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});
beforeEach(async () => {
  await redis.flushdb();
});

const sdkError = (
  code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
  retryable: boolean,
): NotificationError => new NotificationError(code, 'boom', { retryable });

const fakeSdk = (overrides: Partial<ClosableNotifier> = {}): { notifier: ClosableNotifier } => ({
  notifier: {
    sendPush: () => Promise.resolve({ tokens: [], sent: 1, invalidTokens: [] }),
    sendEmail: () => Promise.resolve({ accepted: ['a@example.test'], rejected: [] }),
    close: () => Promise.resolve(),
    ...overrides,
  },
});

const build = (sdk: ClosableNotifier, seen: NotifierOptions[]) => (options: NotifierOptions) => {
  seen.push(options);
  return sdk;
};

describe('real notifier adapter', () => {
  it('builds the SDK from the settings: dev/prod, FCM, SMTP sender, Redis idempotency', () => {
    const seen: NotifierOptions[] = [];
    for (const isProduction of [false, true]) {
      createRealNotifier({
        settings: SETTINGS,
        redis,
        logger,
        isProduction,
        build: build(fakeSdk().notifier, seen),
      });
    }
    expect(seen.map((o) => o.environment)).toEqual(['dev', 'prod']);
    const options = seen[0];
    expect(options?.push).toMatchObject({
      provider: 'fcm',
      credentials: SETTINGS.fcm.serviceAccountJson,
      projectId: 'p',
      dryRun: true,
    });
    expect(options?.email).toMatchObject({
      provider: 'smtp',
      from: { name: 'WAB', address: 'noreply@example.test' },
      smtp: { host: 'smtp.example.test', port: 587, user: 'u@example.test' },
    });
    expect(options?.idempotency?.store).toBeDefined();
  });

  it('omits the project id when none is configured', () => {
    const seen: NotifierOptions[] = [];
    const fcm = { serviceAccountJson: SETTINGS.fcm.serviceAccountJson, dryRun: true };
    createRealNotifier({
      settings: { ...SETTINGS, fcm },
      redis,
      logger,
      isProduction: false,
      build: build(fakeSdk().notifier, seen),
    });
    expect(seen[0]?.push).not.toHaveProperty('projectId');
  });

  it('passes requests and results straight through and closes the SDK', async () => {
    let closed = 0;
    const sdk = fakeSdk({
      close: () => {
        closed += 1;
        return Promise.resolve();
      },
    }).notifier;
    const notifier = createRealNotifier({
      settings: SETTINGS,
      redis,
      logger,
      isProduction: false,
      build: build(sdk, []),
    });
    await expect(notifier.sendPush(PUSH)).resolves.toMatchObject({ sent: 1 });
    await expect(notifier.sendEmail(EMAIL)).resolves.toMatchObject({
      accepted: ['a@example.test'],
    });
    await notifier.close();
    expect(closed).toBe(1);
  });

  it.each([
    [ERROR_CODES.NETWORK_ERROR, true, 503],
    [ERROR_CODES.AUTH_FAILED, false, 502],
    [ERROR_CODES.QUOTA_EXCEEDED, false, 502],
  ] as const)('maps SDK %s (retryable=%s) to a typed %s', async (code, retryable, status) => {
    const failing = fakeSdk({
      sendPush: () => Promise.reject(sdkError(code, retryable)),
      sendEmail: () => Promise.reject(sdkError(code, retryable)),
    }).notifier;
    const notifier = createRealNotifier({
      settings: SETTINGS,
      redis,
      logger,
      isProduction: false,
      build: build(failing, []),
    });
    for (const call of [() => notifier.sendPush(PUSH), () => notifier.sendEmail(EMAIL)]) {
      const failure = await call().catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(ExternalServiceError);
      expect((failure as ExternalServiceError).httpStatus).toBe(status);
      expect((failure as ExternalServiceError).cause).toBeInstanceOf(NotificationError);
    }
  });

  it.each([ERROR_CODES.CONFIG_INVALID, ERROR_CODES.VALIDATION_FAILED, ERROR_CODES.PAYLOAD_INVALID])(
    'treats %s as a caller bug (RangeError), not a provider outage',
    (code) => {
      expect(() => mapSdkError(sdkError(code, false))).toThrow(RangeError);
    },
  );

  it('rethrows errors that are not SDK errors unchanged', () => {
    const original = new Error('other');
    expect(() => mapSdkError(original)).toThrow(original);
  });
});

describe('bridges', () => {
  it('Redis bridge supports get, set with expiry, set NX and del', async () => {
    const bridge = toRedisLike(redis);
    expect(await bridge.get('k')).toBeNull();
    expect(await bridge.set('k', 'v', 'EX', 60)).toBe('OK');
    expect(await bridge.get('k')).toBe('v');
    expect(await redis.ttl('k')).toBeGreaterThan(0);
    expect(await bridge.set('k', 'w', 'EX', 60, 'NX')).toBeNull();
    expect(await bridge.get('k')).toBe('v');
    expect(await bridge.set('k2', 'w', 'EX', 60, 'NX')).toBe('OK');
    await bridge.del('k');
    expect(await bridge.get('k')).toBeNull();
  });

  it('logger bridge swaps the argument order for pino', () => {
    const calls: unknown[][] = [];
    const record = (...args: unknown[]): void => {
      calls.push(args);
    };
    const sdk = toSdkLogger({
      debug: record,
      info: record,
      warn: record,
      error: record,
    } as unknown as Parameters<typeof toSdkLogger>[0]);
    sdk.debug('a', { x: 1 });
    sdk.info('b');
    sdk.warn('c', { y: 2 });
    sdk.error('d');
    expect(calls).toEqual([
      [{ x: 1 }, 'a'],
      [{}, 'b'],
      [{ y: 2 }, 'c'],
      [{}, 'd'],
    ]);
  });
});

describe('createProviders with a real notifier', () => {
  const modes = {
    otp: 'fake',
    storage: 'fake',
    notifier: 'real',
    payments: 'fake',
    analytics: 'fake',
  } as const;
  const config = { notifier: SETTINGS } as never;

  it('fails clearly without credentials or runtime dependencies', () => {
    expect(() => createProviders(modes, false)).toThrow(ProviderUnavailableError);
    expect(() => createProviders(modes, false, { redis, logger, config: {} as never })).toThrow(
      ProviderUnavailableError,
    );
  });

  it('fails fast at start-up when the service account is invalid', () => {
    expect(() => createProviders(modes, false, { redis, logger, config })).toThrow(
      NotificationError,
    );
  });

  it('builds the real notifier and closes it on shutdown', async () => {
    // A throwaway key generated here, so no key material is committed.
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    const account = JSON.stringify({
      type: 'service_account',
      project_id: 'p',
      client_email: 'svc@p.iam.example.test',
      private_key: privateKey,
    });
    const valid = {
      notifier: { ...SETTINGS, fcm: { ...SETTINGS.fcm, serviceAccountJson: account } },
    } as never;
    const providers = createProviders(modes, false, { redis, logger, config: valid });
    expect(typeof providers.notifier.sendPush).toBe('function');
    await expect(providers.close()).resolves.toBeUndefined();
  });

  it('close is a no-op for fakes', async () => {
    const fakes = { ...modes, notifier: 'fake' } as const;
    await expect(createProviders(fakes, false).close()).resolves.toBeUndefined();
  });
});
