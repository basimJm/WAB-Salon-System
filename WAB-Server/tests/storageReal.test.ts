import { generateKeyPairSync } from 'node:crypto';
import { ERROR_CODES, StorageError, type Storage, type StorageOptions } from '@wab/storage';
import type { AppConfig, StorageSettings } from '../src/config';
import { STORAGE_SIGNED_URL_MAX_TTL_SEC } from '../src/constants/providers';
import { UPLOAD_URL_TTL_SEC } from '../src/constants/uploads';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import {
  createRealStorage,
  mapStorageError,
  toStorageOptions,
} from '../src/providers/storage/real';
import { ExternalServiceError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';

const logger = createLogger({ level: 'silent' });
const SETTINGS: StorageSettings = {
  region: 'eu-central-1',
  publicBucket: 'wab-public',
  privateBucket: 'wab-private',
  forcePathStyle: false,
  cdnBaseUrl: 'https://cdn.example.test',
};
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const UPLOAD = {
  key: 'salons/cover/1/a.jpg',
  visibility: 'PUBLIC',
  contentType: 'image/jpeg',
  maxBytes: 100,
  expiresInSec: 60,
} as const;
const CONFIRM = {
  key: UPLOAD.key,
  visibility: 'PUBLIC',
  contentType: 'image/jpeg',
  maxBytes: 100,
} as const;

const sdkFailure = (
  code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
  retryable = false,
): StorageError => new StorageError(code, 'x', { retryable });

/** A scripted SDK: every method answers from `script`, or throws the given error. */
const fakeSdk = (overrides: Partial<Record<keyof Storage, unknown>> = {}): Storage => {
  const base = {
    createUploadUrl: () =>
      Promise.resolve({
        url: 'https://u.test',
        method: 'PUT',
        headers: {},
        expiresAt: new Date(0),
      }),
    confirmUpload: () =>
      Promise.resolve({ status: 'CONFIRMED', size: 3, contentType: 'image/jpeg' }),
    getPublicUrl: (key: string) => `https://cdn.example.test/${key}`,
    getSignedUrl: () => Promise.resolve('https://signed.test'),
    read: () => Promise.resolve(Buffer.from('abc')),
    write: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    createVariants: () => Promise.resolve({ created: [] }),
    variantKey: (key: string) => key,
    variantKeys: (key: string) => [key],
  };
  return { ...base, ...overrides } as unknown as Storage;
};
const build =
  (sdk: Storage, seen?: StorageOptions[]) =>
  (options: StorageOptions): Storage => {
    seen?.push(options);
    return sdk;
  };

describe('toStorageOptions', () => {
  it('maps dev settings, including a MinIO endpoint and credentials', () => {
    const options = toStorageOptions({
      settings: {
        ...SETTINGS,
        endpoint: 'http://localhost:9000',
        forcePathStyle: true,
        credentials: { accessKeyId: 'id', secretAccessKey: 'value' },
      },
      isProduction: false,
      logger,
    });
    expect(options).toMatchObject({
      environment: 'dev',
      provider: 's3',
      s3: {
        region: 'eu-central-1',
        publicBucket: 'wab-public',
        privateBucket: 'wab-private',
        endpoint: 'http://localhost:9000',
        forcePathStyle: true,
        credentials: { accessKeyId: 'id', secretAccessKey: 'value' },
      },
      cdn: { baseUrl: 'https://cdn.example.test' },
      upload: { maxTtlSec: UPLOAD_URL_TTL_SEC },
      signedUrl: { maxTtlSec: STORAGE_SIGNED_URL_MAX_TTL_SEC, mode: 's3' },
    });
  });
  it('maps production without endpoint or credentials (IAM role) and with CloudFront', () => {
    const plain = toStorageOptions({ settings: SETTINGS, isProduction: true, logger });
    expect(plain.environment).toBe('prod');
    expect(plain.s3).toEqual({
      region: 'eu-central-1',
      publicBucket: 'wab-public',
      privateBucket: 'wab-private',
      forcePathStyle: false,
    });
    const signed = toStorageOptions({
      settings: {
        ...SETTINGS,
        cloudfront: { baseUrl: 'https://private.example.test', keyPairId: 'K1', privateKey },
      },
      isProduction: true,
      logger,
    });
    expect(signed.signedUrl).toMatchObject({ mode: 'cloudfront', cloudfront: { keyPairId: 'K1' } });
  });
  it('keeps the signed-URL ceiling at the longest lifetime the server asks for', () => {
    expect(STORAGE_SIGNED_URL_MAX_TTL_SEC).toBeGreaterThan(0);
  });
});

describe('createRealStorage delegation', () => {
  it('passes requests through and returns the SDK answers', async () => {
    const store = createRealStorage({
      settings: SETTINGS,
      isProduction: false,
      logger,
      build: build(fakeSdk()),
    });
    await expect(store.createUploadUrl(UPLOAD)).resolves.toMatchObject({ method: 'PUT' });
    await expect(store.confirmUpload(CONFIRM)).resolves.toEqual({
      status: 'CONFIRMED',
      size: 3,
      contentType: 'image/jpeg',
    });
    expect(store.getPublicUrl('a/b.jpg')).toBe('https://cdn.example.test/a/b.jpg');
    await expect(store.getSignedUrl({ key: 'a/b', expiresInSec: 5 })).resolves.toBe(
      'https://signed.test',
    );
    await expect(store.read('a/b')).resolves.toEqual(Buffer.from('abc'));
    await expect(
      store.write({
        key: 'a/b',
        body: Buffer.from('x'),
        contentType: 'image/png',
        visibility: 'PUBLIC',
      }),
    ).resolves.toBeUndefined();
    await expect(store.delete(['a/b'])).resolves.toBeUndefined();
  });
  it('builds the SDK from the mapped options', () => {
    const seen: StorageOptions[] = [];
    createRealStorage({
      settings: SETTINGS,
      isProduction: true,
      logger,
      build: build(fakeSdk(), seen),
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.environment).toBe('prod');
  });
  it('maps the empty-file rejection to the domain reason TYPE_MISMATCH and keeps the others', async () => {
    const reasons = ['EMPTY', 'TYPE_MISMATCH', 'TOO_LARGE', 'NOT_FOUND'] as const;
    const seen: string[] = [];
    for (const reason of reasons) {
      const store = createRealStorage({
        settings: SETTINGS,
        isProduction: false,
        logger,
        build: build(
          fakeSdk({ confirmUpload: () => Promise.resolve({ status: 'REJECTED', reason }) }),
        ),
      });
      const result = await store.confirmUpload(CONFIRM);
      seen.push(result.status === 'REJECTED' ? result.reason : 'CONFIRMED');
    }
    expect(seen).toEqual(['TYPE_MISMATCH', 'TYPE_MISMATCH', 'TOO_LARGE', 'NOT_FOUND']);
  });
});

describe('error mapping', () => {
  it.each([ERROR_CODES.VALIDATION_FAILED, ERROR_CODES.KEY_INVALID, ERROR_CODES.TYPE_NOT_ALLOWED])(
    'turns caller error %s into a RangeError',
    (code) => {
      expect(() => mapStorageError(sdkFailure(code))).toThrow(RangeError);
    },
  );
  it.each([
    [ERROR_CODES.UNAVAILABLE, true],
    [ERROR_CODES.RATE_LIMITED, true],
    [ERROR_CODES.TIMEOUT, true],
    [ERROR_CODES.NETWORK_ERROR, true],
    [ERROR_CODES.ACCESS_DENIED, false],
    [ERROR_CODES.AUTH_FAILED, false],
    [ERROR_CODES.CONFIG_INVALID, false],
    [ERROR_CODES.VENDOR_ERROR, false],
    [ERROR_CODES.MALFORMED_RESPONSE, false],
    [ERROR_CODES.UNKNOWN, false],
  ])('turns provider error %s into ExternalServiceError (unavailable=%s)', (code, retryable) => {
    let caught: unknown;
    try {
      mapStorageError(sdkFailure(code, retryable));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ExternalServiceError);
    expect((caught as ExternalServiceError).cause).toBeInstanceOf(StorageError);
  });
  it('rethrows foreign errors untouched', () => {
    const foreign = new TypeError('bug');
    expect(() => mapStorageError(foreign)).toThrow(foreign);
  });
  it('maps failures of every method, sync and async', async () => {
    const failing = (code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES]): Storage =>
      fakeSdk({
        createUploadUrl: () => Promise.reject(sdkFailure(code, true)),
        confirmUpload: () => Promise.reject(sdkFailure(code, true)),
        getPublicUrl: () => {
          throw sdkFailure(ERROR_CODES.KEY_INVALID);
        },
        getSignedUrl: () => Promise.reject(sdkFailure(code, true)),
        read: () => Promise.reject(sdkFailure(code, true)),
        write: () => Promise.reject(sdkFailure(code, true)),
        delete: () => Promise.reject(sdkFailure(code, true)),
      });
    const store = createRealStorage({
      settings: SETTINGS,
      isProduction: false,
      logger,
      build: build(failing(ERROR_CODES.UNAVAILABLE)),
    });
    const write = {
      key: 'a/b',
      body: Buffer.from('x'),
      contentType: 'image/png',
      visibility: 'PUBLIC',
    } as const;
    for (const call of [
      () => store.createUploadUrl(UPLOAD),
      () => store.confirmUpload(CONFIRM),
      () => store.getSignedUrl({ key: 'a/b', expiresInSec: 5 }),
      () => store.read('a/b'),
      () => store.write(write),
      () => store.delete(['a/b']),
    ])
      await expect(call()).rejects.toBeInstanceOf(ExternalServiceError);
    expect(() => store.getPublicUrl('../x')).toThrow(RangeError);
  });
});

describe('createProviders with the real storage', () => {
  const FAKES = {
    otp: 'fake',
    storage: 'real',
    notifier: 'fake',
    payments: 'fake',
    analytics: 'fake',
  } as const;
  const depsWith = (storage?: StorageSettings): Parameters<typeof createProviders>[2] => ({
    redis: {} as never,
    logger,
    config: { otp: {}, ...(storage === undefined ? {} : { storage }) } as AppConfig,
  });

  it('builds the SDK-backed provider from the config', async () => {
    const providers = createProviders(FAKES, false, depsWith(SETTINGS));
    expect(providers.storage.getPublicUrl('a/b.jpg')).toBe('https://cdn.example.test/a/b.jpg');
    await providers.close();
  });
  it('fails loudly without settings or runtime dependencies', () => {
    expect(() => createProviders(FAKES, false, depsWith())).toThrow(ProviderUnavailableError);
    expect(() => createProviders(FAKES, false)).toThrow(ProviderUnavailableError);
  });
  it('rejects invalid SDK configuration at start-up (production needs an https CDN)', () => {
    expect(() =>
      createRealStorage({
        settings: { ...SETTINGS, cdnBaseUrl: 'http://cdn.example.test' },
        isProduction: true,
        logger,
      }),
    ).toThrow(StorageError);
  });
});

describe('real SDK, no network: presigning is local', () => {
  const real = (settings: StorageSettings = SETTINGS): ReturnType<typeof createRealStorage> =>
    createRealStorage({
      settings: {
        ...settings,
        credentials: { accessKeyId: 'test-id', secretAccessKey: 'test-value' },
      },
      isProduction: false,
      logger,
    });

  it('presigns an upload pinned to the content type in the public bucket', async () => {
    const target = await real().createUploadUrl(UPLOAD);
    const url = new URL(target.url);
    expect(url.hostname).toContain('wab-public');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60');
    expect(target.headers).toEqual({ 'Content-Type': 'image/jpeg' });
  });
  it('signs private files with S3 or with CloudFront, and builds CDN URLs', async () => {
    const s3Url = new URL(await real().getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 60 }));
    expect(s3Url.hostname).toContain('wab-private');
    const cloud = real({
      ...SETTINGS,
      cloudfront: { baseUrl: 'https://private.example.test', keyPairId: 'K1', privateKey },
    });
    const signed = await cloud.getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 60 });
    expect(signed).toMatch(
      /^https:\/\/private\.example\.test\/docs\/l\.pdf\?Expires=\d+&Signature=.+&Key-Pair-Id=K1$/,
    );
    expect(real().getPublicUrl('a/b.jpg')).toBe('https://cdn.example.test/a/b.jpg');
  });
  it('refuses a signed-URL lifetime above the configured ceiling as a caller bug', async () => {
    await expect(
      real().getSignedUrl({ key: 'docs/l.pdf', expiresInSec: STORAGE_SIGNED_URL_MAX_TTL_SEC + 1 }),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
