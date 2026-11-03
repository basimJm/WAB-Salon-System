import { ERROR_CODES, StorageError, type Storage } from '@wab/storage';
import type { AppConfig, R2StorageSettings } from '../src/config';
import { STORAGE_SIGNED_URL_MAX_TTL_SEC } from '../src/constants/providers';
import { UPLOAD_URL_TTL_SEC } from '../src/constants/uploads';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import { FakeStorageProvider } from '../src/providers/storage';
import { createRealStorage, toStorageOptions } from '../src/providers/storage/real';
import { ExternalServiceError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';

const logger = createLogger({ level: 'silent' });
/** Obviously fake R2 values (SRV-180). */
const R2: R2StorageSettings = {
  provider: 'r2',
  accountId: 'acc123',
  publicBucket: 'wab-public',
  privateBucket: 'wab-private',
  credentials: { accessKeyId: 'not-a-real-r2-key', secretAccessKey: 'not-a-real-r2-secret' },
  cdnBaseUrl: 'https://files.example.test',
};
const COPY = {
  fromKey: 'tmp/u1.jpg',
  toKey: 'customers/c1/profile/avatar',
  visibility: 'PUBLIC',
} as const;

const sdkWith = (overrides: Partial<Record<keyof Storage, unknown>>): Storage =>
  ({
    getPublicUrl: (key: string) => `${R2.cdnBaseUrl}/${key}`,
    ...overrides,
  }) as unknown as Storage;

describe('toStorageOptions for Cloudflare R2', () => {
  it('maps the R2 settings onto the SDK r2 provider (S3 signing, no CloudFront)', () => {
    const options = toStorageOptions({ settings: R2, isProduction: true, logger });
    expect(options).toMatchObject({
      environment: 'prod',
      provider: 'r2',
      r2: {
        accountId: 'acc123',
        publicBucket: 'wab-public',
        privateBucket: 'wab-private',
        credentials: R2.credentials,
      },
      cdn: { baseUrl: 'https://files.example.test' },
      upload: { maxTtlSec: UPLOAD_URL_TTL_SEC },
      signedUrl: { maxTtlSec: STORAGE_SIGNED_URL_MAX_TTL_SEC, mode: 's3' },
    });
    expect(options.r2).not.toHaveProperty('endpoint');
    const endpoint = 'https://acc123.eu.r2.cloudflarestorage.com';
    expect(
      toStorageOptions({ settings: { ...R2, endpoint }, isProduction: false, logger }).r2,
    ).toMatchObject({ endpoint });
  });
});

describe('copy + stat through the SDK-backed provider', () => {
  const store = (sdk: Storage): ReturnType<typeof createRealStorage> =>
    createRealStorage({ settings: R2, isProduction: false, logger, build: () => sdk });

  it('copies, reports a missing source as an answer, and returns object info', async () => {
    const seen: unknown[] = [];
    const info = {
      visibility: 'PUBLIC',
      size: 3,
      contentType: 'image/jpeg',
      updatedAt: new Date(0),
    };
    const ok = store(
      sdkWith({
        copy: (request: unknown) => {
          seen.push(request);
          return Promise.resolve();
        },
        stat: () => Promise.resolve(info),
      }),
    );
    await expect(ok.copy(COPY)).resolves.toBe('COPIED');
    expect(seen).toEqual([COPY]);
    await expect(ok.stat('a/b')).resolves.toEqual(info);
    const missing = store(
      sdkWith({ copy: () => Promise.reject(new StorageError(ERROR_CODES.OBJECT_NOT_FOUND, 'x')) }),
    );
    await expect(missing.copy(COPY)).resolves.toBe('SOURCE_MISSING');
  });

  it('maps provider failures of copy and stat to ExternalServiceError', async () => {
    const down = new StorageError(ERROR_CODES.UNAVAILABLE, 'x', { retryable: true });
    const failing = store(
      sdkWith({ copy: () => Promise.reject(down), stat: () => Promise.reject(down) }),
    );
    await expect(failing.copy(COPY)).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(failing.stat('a/b')).rejects.toBeInstanceOf(ExternalServiceError);
  });
});

describe('createProviders with STORAGE_PROVIDER=cloudflare-r2', () => {
  const MODES = {
    otp: 'fake',
    storage: 'cloudflare-r2',
    notifier: 'fake',
    payments: 'fake',
  } as const;
  const deps = (storage?: AppConfig['storage']): Parameters<typeof createProviders>[2] => ({
    redis: {} as never,
    logger,
    config: { otp: {}, ...(storage === undefined ? {} : { storage }) } as AppConfig,
  });

  it('builds the R2 provider; public URLs come from R2_PUBLIC_URL', async () => {
    const providers = createProviders(MODES, false, deps(R2));
    expect(providers.storage.getPublicUrl('customers/c1/profile/avatar')).toBe(
      'https://files.example.test/customers/c1/profile/avatar',
    );
    await providers.close();
  });

  it('refuses missing settings, settings of the other store, and fakes in production', () => {
    expect(() => createProviders(MODES, false, deps())).toThrow(ProviderUnavailableError);
    const s3 = {
      region: 'eu-central-1',
      publicBucket: 'p',
      privateBucket: 'q',
      forcePathStyle: false,
      cdnBaseUrl: 'https://cdn.example.test',
    };
    expect(() => createProviders(MODES, false, deps(s3))).toThrow(ProviderUnavailableError);
    expect(() => createProviders({ ...MODES, storage: 'real' }, false, deps(R2))).toThrow(
      ProviderUnavailableError,
    );
    expect(() => createProviders({ ...MODES, storage: 'fake' }, true, deps())).toThrow(
      ProviderUnavailableError,
    );
  });
});

describe('real SDK on R2, no network: signing is local and credentials stay on the server', () => {
  const r2 = (): ReturnType<typeof createRealStorage> =>
    createRealStorage({ settings: R2, isProduction: false, logger });

  it('presigns an upload to the public bucket on the account endpoint, without checksum parameters', async () => {
    const target = await r2().createUploadUrl({
      key: 'tmp/customers/c1/u1.jpg',
      visibility: 'PUBLIC',
      contentType: 'image/jpeg',
      maxBytes: 1_000,
      expiresInSec: 60,
    });
    expect(target.url).toContain(
      'https://wab-public.acc123.r2.cloudflarestorage.com/tmp/customers/c1/u1.jpg',
    );
    expect(target.url).toContain('%2Fauto%2Fs3%2Faws4_request');
    expect(target.url).not.toMatch(/checksum/i);
    expect(target.url).not.toContain('not-a-real-r2-secret');
    expect(target.headers).toEqual({ 'Content-Type': 'image/jpeg' });
  });

  it('signs private reads against the private bucket only', async () => {
    const url = await r2().getSignedUrl({ key: 'licenses/s1/doc.pdf', expiresInSec: 60 });
    expect(url).toContain(
      'https://wab-private.acc123.r2.cloudflarestorage.com/licenses/s1/doc.pdf',
    );
    expect(url).toContain('X-Amz-Expires=60');
  });

  it('refuses one bucket for both (R2 public access is per bucket) at start-up', () => {
    expect(() =>
      createRealStorage({
        settings: { ...R2, privateBucket: 'wab-public' },
        isProduction: false,
        logger,
      }),
    ).toThrow(StorageError);
  });
});

describe('FakeStorageProvider copy + stat', () => {
  it('replaces the target in the same visibility and reports its info', async () => {
    const fake = new FakeStorageProvider({ now: () => new Date('2026-11-01T10:00:00.000Z') });
    await fake.write({
      key: 'tmp/a',
      body: Buffer.from('new'),
      contentType: 'image/png',
      visibility: 'PUBLIC',
    });
    await fake.write({
      key: 'slot/a',
      body: Buffer.from('old'),
      contentType: 'image/jpeg',
      visibility: 'PUBLIC',
    });
    await expect(
      fake.copy({ fromKey: 'tmp/a', toKey: 'slot/a', visibility: 'PUBLIC' }),
    ).resolves.toBe('COPIED');
    await expect(fake.read('slot/a')).resolves.toEqual(Buffer.from('new'));
    await expect(fake.stat('slot/a')).resolves.toEqual({
      visibility: 'PUBLIC',
      size: 3,
      contentType: 'image/png',
      updatedAt: new Date('2026-11-01T10:00:00.000Z'),
    });
    expect(fake.copies).toBe(1);
    await expect(
      fake.copy({ fromKey: 'tmp/a', toKey: 'x/b', visibility: 'PRIVATE' }),
    ).resolves.toBe('SOURCE_MISSING');
    await expect(
      fake.copy({ fromKey: 'tmp/a', toKey: 'tmp/a', visibility: 'PUBLIC' }),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(fake.stat('none/x')).resolves.toBeNull();
  });
});
