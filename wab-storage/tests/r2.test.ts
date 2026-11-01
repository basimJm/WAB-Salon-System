import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalFsStorage } from '../src/adapters/localFs';
import { MemoryStorage } from '../src/adapters/memory';
import { S3Storage } from '../src/adapters/s3';
import { createAwsDeps } from '../src/adapters/s3/deps';
import { ERROR_CODES, R2_REGION, r2Endpoint } from '../src/constants/codes';
import { DEFAULT_RETRY } from '../src/constants/defaults';
import { resolveConfig, type StorageOptions } from '../src/config/options';
import type { StorageError } from '../src/errors';
import { noopLogger } from '../src/logger';
import { configureBucketCors, createStorage } from '../src/storage';
import { FakeS3 } from './fakeS3';
import { FILES, fixedClock } from './helpers';

const credentials = { accessKeyId: 'r2-key-id', secretAccessKey: 'r2-secret' };
const r2 = {
  accountId: 'acc123',
  publicBucket: 'wab-public',
  privateBucket: 'wab-private',
  credentials,
};
const options = (extra: Partial<StorageOptions> = {}): StorageOptions => ({
  environment: 'prod',
  provider: 'r2',
  r2,
  cdn: { baseUrl: 'https://files.wab.example' },
  ...extra,
});
const fieldsOf = (input: StorageOptions): string[] => {
  try {
    resolveConfig(input);
  } catch (error) {
    return (error as StorageError).details['fields'] as string[];
  }
  throw new Error('expected a configuration error');
};

describe('Cloudflare R2 configuration', () => {
  it('maps R2 onto the S3 API: account endpoint, region auto, checksums only when required', () => {
    const config = resolveConfig(options());
    expect(config.provider).toBe('r2');
    expect(config.s3).toEqual({
      region: R2_REGION,
      publicBucket: 'wab-public',
      privateBucket: 'wab-private',
      endpoint: 'https://acc123.r2.cloudflarestorage.com',
      forcePathStyle: false,
      credentials,
      checksums: 'when-required',
    });
    expect(r2Endpoint('x')).toBe('https://x.r2.cloudflarestorage.com');
  });

  it('keeps an explicit endpoint (jurisdiction) and the public domain as the CDN', () => {
    const endpoint = 'https://acc123.eu.r2.cloudflarestorage.com';
    const config = resolveConfig(options({ r2: { ...r2, endpoint } }));
    expect(config.s3?.endpoint).toBe(endpoint);
    expect(createStorage(options()).getPublicUrl('customers/c1/profile/avatar')).toBe(
      'https://files.wab.example/customers/c1/profile/avatar',
    );
  });

  it.each([
    [options({ r2: undefined }), 'r2'],
    [options({ r2: { ...r2, privateBucket: 'wab-public' } }), 'r2.privateBucket'],
    [options({ r2: { ...r2, endpoint: 'http://localhost:9000' } }), 'r2.endpoint'],
    [
      options({
        signedUrl: {
          mode: 'cloudfront',
          cloudfront: { baseUrl: 'https://p.x', keyPairId: 'k', privateKey: 'p' },
        },
      }),
      'signedUrl.mode',
    ],
  ])('refuses unsafe R2 setups (%#)', (input, field) => {
    expect(fieldsOf(input)).toContain(field);
  });

  it('requires credentials (R2 has no instance roles) and never echoes them', () => {
    const fields = fieldsOf(options({ r2: { ...r2, credentials: undefined as never } }));
    expect(fields).toContain('r2.credentials');
    try {
      resolveConfig(options({ r2: { ...r2, publicBucket: '' } }));
    } catch (error) {
      expect((error as Error).message).not.toContain('r2-secret');
    }
  });

  it('presigns an upload without checksum parameters (R2 rejects unknown algorithms)', async () => {
    const deps = await createAwsDeps(
      {
        region: R2_REGION,
        publicBucket: 'wab-public',
        privateBucket: 'wab-private',
        endpoint: r2Endpoint('acc123'),
        forcePathStyle: false,
        credentials,
        checksums: 'when-required',
      },
      1_000,
    );
    const url = await deps.presign(
      new deps.commands.Put({ Bucket: 'wab-public', Key: 'tmp/u1.jpg', ContentType: 'image/jpeg' }),
      { expiresIn: 60, signableHeaders: new Set(['content-type']) },
    );
    expect(url).toContain('https://wab-public.acc123.r2.cloudflarestorage.com/tmp/u1.jpg');
    expect(url).toContain('X-Amz-Credential=r2-key-id%2F');
    expect(url).toContain('%2Fauto%2Fs3%2Faws4_request');
    expect(url).not.toMatch(/x-amz-checksum|x-amz-sdk-checksum-algorithm/i);
    expect(url).not.toContain('r2-secret');
  });
});

const settings = {
  cdnBaseUrl: 'https://cdn.test',
  uploadMaxTtlSec: 300,
  signedUrlMaxTtlSec: 600,
  readMaxBytes: 1_000,
  timeoutMs: 1_000,
  retry: { ...DEFAULT_RETRY, maxAttempts: 1 },
  publicCacheControl: 'public, max-age=60',
  logger: noopLogger,
  s3: { region: R2_REGION, publicBucket: 'pub', privateBucket: 'priv', forcePathStyle: false },
};
const s3Store = (): { s3: FakeS3; store: S3Storage } => {
  const s3 = new FakeS3();
  const store = new S3Storage(settings, {
    loadDeps: () => Promise.resolve(s3.deps()),
    retryDeps: { sleep: () => Promise.resolve(), random: () => 0.5 },
    now: fixedClock().now,
  });
  return { s3, store };
};

describe('S3 / R2 adapter copy + stat', () => {
  it('copies onto the target key in the same bucket, replacing it (type + public cache kept)', async () => {
    const { s3, store } = s3Store();
    s3.put('pub', 'tmp/u1.png', FILES.png, 'image/png');
    s3.put('pub', 'customers/c1/profile/avatar', FILES.jpeg, 'image/jpeg');
    await store.copy({
      fromKey: 'tmp/u1.png',
      toKey: 'customers/c1/profile/avatar',
      visibility: 'PUBLIC',
    });
    const copied = s3.bucket('pub').get('customers/c1/profile/avatar');
    expect(copied?.body.equals(FILES.png)).toBe(true);
    expect(copied?.contentType).toBe('image/png');
    const call = s3.calls.find((c) => c.type === 'Copy');
    expect(call?.input).toMatchObject({
      Bucket: 'pub',
      CopySource: 'pub/tmp/u1.png',
      MetadataDirective: 'REPLACE',
      CacheControl: 'public, max-age=60',
    });
  });

  it('keeps private copies private and without the public cache header', async () => {
    const { s3, store } = s3Store();
    s3.put('priv', 'tmp/doc.pdf', Buffer.from('%PDF-1.4 x'), 'application/pdf');
    await store.copy({
      fromKey: 'tmp/doc.pdf',
      toKey: 'documents/s1/license',
      visibility: 'PRIVATE',
    });
    expect(s3.bucket('priv').has('documents/s1/license')).toBe(true);
    expect(s3.bucket('pub').has('documents/s1/license')).toBe(false);
    expect(s3.calls.find((c) => c.type === 'Copy')?.input['CacheControl']).toBeUndefined();
  });

  it('rejects a missing source, the same key and unsafe keys', async () => {
    const { store } = s3Store();
    await expect(
      store.copy({ fromKey: 'tmp/none', toKey: 'a/b', visibility: 'PUBLIC' }),
    ).rejects.toMatchObject({ code: ERROR_CODES.OBJECT_NOT_FOUND });
    await expect(
      store.copy({ fromKey: 'a/b', toKey: 'a/b', visibility: 'PUBLIC' }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
    await expect(
      store.copy({ fromKey: '../x', toKey: 'a/b', visibility: 'PUBLIC' }),
    ).rejects.toMatchObject({ code: ERROR_CODES.KEY_INVALID });
  });

  it('stats an object in either bucket, null when absent', async () => {
    const { s3, store } = s3Store();
    s3.put('priv', 'documents/s1/license', FILES.png, 'image/png');
    await expect(store.stat('documents/s1/license')).resolves.toEqual({
      visibility: 'PRIVATE',
      size: FILES.png.length,
      contentType: 'image/png',
      updatedAt: s3.lastModified,
    });
    await expect(store.stat('nothing/here')).resolves.toBeNull();
  });
});

describe('memory + local-fs adapters copy + stat', () => {
  it('memory: copy overwrites, keeps visibility and type; stat reports it', async () => {
    const clock = fixedClock();
    const store = new MemoryStorage(
      { cdnBaseUrl: 'http://cdn.test', uploadMaxTtlSec: 300, signedUrlMaxTtlSec: 600 },
      clock.now,
    );
    await store.write({
      key: 'tmp/a',
      body: FILES.png,
      contentType: 'image/png',
      visibility: 'PUBLIC',
    });
    await store.write({
      key: 'slot/x',
      body: FILES.jpeg,
      contentType: 'image/jpeg',
      visibility: 'PUBLIC',
    });
    await store.copy({ fromKey: 'tmp/a', toKey: 'slot/x', visibility: 'PUBLIC' });
    expect((await store.read('slot/x'))?.equals(FILES.png)).toBe(true);
    await expect(store.stat('slot/x')).resolves.toMatchObject({
      visibility: 'PUBLIC',
      size: FILES.png.length,
      contentType: 'image/png',
    });
    await expect(
      store.copy({ fromKey: 'tmp/a', toKey: 'p/y', visibility: 'PRIVATE' }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.OBJECT_NOT_FOUND,
    });
    await expect(store.stat('none')).resolves.toBeNull();
  });

  it('local-fs: copy overwrites in the same location; stat has size and time', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wab-storage-r2-'));
    try {
      const store = new LocalFsStorage(
        {
          cdnBaseUrl: 'http://cdn.test',
          uploadMaxTtlSec: 300,
          signedUrlMaxTtlSec: 600,
          localFs: { rootDir: root, baseUrl: 'http://cdn.test' },
        },
        fixedClock().now,
      );
      await store.write({
        key: 'tmp/a',
        body: FILES.png,
        contentType: 'image/png',
        visibility: 'PRIVATE',
      });
      await store.copy({ fromKey: 'tmp/a', toKey: 'docs/b', visibility: 'PRIVATE' });
      expect((await store.read('docs/b'))?.equals(FILES.png)).toBe(true);
      const info = await store.stat('docs/b');
      expect(info).toMatchObject({
        visibility: 'PRIVATE',
        size: FILES.png.length,
        contentType: null,
      });
      expect(Number.isFinite(info?.updatedAt?.getTime())).toBe(true);
      await expect(
        store.copy({ fromKey: 'none', toKey: 'docs/c', visibility: 'PRIVATE' }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.OBJECT_NOT_FOUND,
      });
      await expect(store.stat('none')).resolves.toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('createStorage exposes copy + stat on every provider', () => {
  it('delegates copy and stat (memory provider)', async () => {
    const storage = createStorage({
      environment: 'dev',
      provider: 'memory',
      cdn: { baseUrl: 'http://cdn.test' },
    });
    await storage.write({
      key: 'tmp/a',
      body: FILES.png,
      contentType: 'image/png',
      visibility: 'PUBLIC',
    });
    await storage.copy({ fromKey: 'tmp/a', toKey: 'slot/a', visibility: 'PUBLIC' });
    await expect(storage.stat('slot/a')).resolves.toMatchObject({ size: FILES.png.length });
  });
});

describe('bucket CORS for browser uploads (admin panel)', () => {
  it('sets one exact-origin rule on both buckets', async () => {
    const { s3, store } = s3Store();
    await store.configureCors({ allowedOrigins: ['https://admin.wab.example'], maxAgeSec: 600 });
    for (const bucket of ['pub', 'priv'])
      expect(s3.cors.get(bucket)).toEqual({
        CORSRules: [
          {
            AllowedOrigins: ['https://admin.wab.example'],
            AllowedMethods: ['GET', 'HEAD', 'PUT'],
            AllowedHeaders: ['content-type'],
            ExposeHeaders: ['etag'],
            MaxAgeSeconds: 600,
          },
        ],
      });
  });

  it('refuses wildcard, paths and an empty list', async () => {
    const { store } = s3Store();
    for (const allowedOrigins of [
      [],
      ['*'],
      ['https://admin.wab.example/path'],
      ['admin.wab.example'],
    ])
      await expect(store.configureCors({ allowedOrigins, maxAgeSec: 60 })).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_FAILED,
      });
  });

  it('configureBucketCors refuses providers without buckets', async () => {
    await expect(
      configureBucketCors(
        { environment: 'dev', provider: 'memory', cdn: { baseUrl: 'http://cdn.test' } },
        { allowedOrigins: ['https://admin.wab.example'], maxAgeSec: 60 },
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.CONFIG_INVALID });
  });
});
