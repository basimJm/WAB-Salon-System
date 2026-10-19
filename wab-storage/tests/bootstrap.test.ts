import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Storage } from '../src/adapters/s3';
import { ERROR_CODES } from '../src/constants/codes';
import { DEFAULT_RETRY } from '../src/constants/defaults';
import { noopLogger } from '../src/logger';
import { SAMPLE_FILES, UPLOAD_FIXTURES } from '../src/fixtures';
import { createStorage, ensureDevBuckets } from '../src/storage';
import type { Storage } from '../src/storage';
import { FakeS3 } from './fakeS3';
import { memoryOptions } from './helpers';
import { MiniS3 } from './miniS3';

const settings = {
  cdnBaseUrl: 'https://cdn.test',
  cloudFront: undefined,
  uploadMaxTtlSec: 300,
  signedUrlMaxTtlSec: 600,
  readMaxBytes: 1_000,
  timeoutMs: 1_000,
  retry: DEFAULT_RETRY,
  publicCacheControl: 'x',
  logger: noopLogger,
  s3: { region: 'r', publicBucket: 'pub', privateBucket: 'priv', forcePathStyle: true },
};
const retryDeps = { sleep: () => Promise.resolve(), random: () => 0.5 };

describe('S3Storage.ensureBuckets', () => {
  it('creates only the missing buckets and is idempotent', async () => {
    const s3 = new FakeS3();
    s3.bucket('pub');
    const store = new S3Storage(settings, {
      loadDeps: () => Promise.resolve(s3.deps()),
      retryDeps,
    });
    await expect(store.ensureBuckets()).resolves.toEqual(['priv']);
    await expect(store.ensureBuckets()).resolves.toEqual([]);
    expect(s3.count('CreateBucket')).toBe(1);
  });
  it('tolerates a concurrent creator but surfaces real failures', async () => {
    const s3 = new FakeS3();
    const raced = Object.assign(new Error('owned'), {
      name: 'BucketAlreadyOwnedByYou',
      $metadata: { httpStatusCode: 409 },
    });
    s3.failNext('CreateBucket', raced);
    const store = new S3Storage(settings, {
      loadDeps: () => Promise.resolve(s3.deps()),
      retryDeps,
    });
    await expect(store.ensureBuckets()).resolves.toEqual(['priv']);
    s3.buckets.clear();
    s3.failNext(
      'CreateBucket',
      Object.assign(new Error('denied'), {
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      }),
    );
    await expect(store.ensureBuckets()).rejects.toMatchObject({ code: ERROR_CODES.ACCESS_DENIED });
  });
});

describe('ensureDevBuckets (real SDK, MinIO-style path-style endpoint)', () => {
  const minio = new MiniS3();
  beforeAll(async () => {
    await minio.start();
  });
  afterAll(async () => {
    await minio.stop();
  });
  const options = (): Parameters<typeof ensureDevBuckets>[0] =>
    memoryOptions({
      provider: 's3',
      s3: {
        region: 'us-east-1',
        publicBucket: 'wab-public',
        privateBucket: 'wab-private',
        endpoint: minio.endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId: 'minio-user', secretAccessKey: 'minio-secret' },
      },
    });
  it('creates both buckets once, then does nothing', async () => {
    await expect(ensureDevBuckets(options())).resolves.toEqual(['wab-public', 'wab-private']);
    await expect(ensureDevBuckets(options())).resolves.toEqual([]);
    expect([...minio.buckets.keys()].sort()).toEqual(['wab-private', 'wab-public']);
  });
  it('refuses production and other providers', async () => {
    await expect(
      ensureDevBuckets({
        ...options(),
        environment: 'prod',
        cdn: { baseUrl: 'https://cdn.example.com' },
        s3: { region: 'r', publicBucket: 'a', privateBucket: 'b' },
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.CONFIG_INVALID });
    await expect(ensureDevBuckets(memoryOptions())).rejects.toMatchObject({
      code: ERROR_CODES.CONFIG_INVALID,
    });
  });
});

/** The same fixtures must behave identically on every adapter (parity). */
describe('rejection fixtures on every adapter', () => {
  const minio = new MiniS3();
  let root: string;
  beforeAll(async () => {
    await minio.start();
    root = await mkdtemp(join(tmpdir(), 'wab-storage-fixtures-'));
  });
  afterAll(async () => {
    await minio.stop();
    await rm(root, { recursive: true, force: true });
  });

  const adapters = (): [string, () => Storage][] => [
    ['memory', () => createStorage(memoryOptions())],
    [
      'local-fs',
      () =>
        createStorage(
          memoryOptions({
            provider: 'local-fs',
            localFs: { rootDir: root, baseUrl: 'http://localhost:3000' },
          }),
        ),
    ],
    [
      's3 (real SDK)',
      () =>
        createStorage(
          memoryOptions({
            provider: 's3',
            s3: {
              region: 'r',
              publicBucket: 'fx-public',
              privateBucket: 'fx-private',
              endpoint: minio.endpoint,
              forcePathStyle: true,
              credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
            },
          }),
        ),
    ],
  ];

  it.each(adapters())('%s', async (_name, build) => {
    const store = build();
    for (const [index, fixture] of UPLOAD_FIXTURES.entries()) {
      const key = `fixtures/${String(index)}/file`;
      if (fixture.body) {
        // memory has no write-bypass for uploads; its upload goes through the presigned flow
        await store.write({
          key,
          body: fixture.body,
          contentType: fixture.declaredType,
          visibility: 'PUBLIC',
        });
      }
      const result = await store.confirmUpload({
        key,
        visibility: 'PUBLIC',
        contentType: fixture.declaredType,
        maxBytes: fixture.maxBytes,
      });
      if (fixture.expected === undefined) {
        expect({ name: fixture.name, status: result.status }).toEqual({
          name: fixture.name,
          status: 'CONFIRMED',
        });
        expect(await store.read(key)).not.toBeNull();
      } else {
        expect({ name: fixture.name, result }).toEqual({
          name: fixture.name,
          result: { status: 'REJECTED', reason: fixture.expected },
        });
        expect(await store.read(key)).toBeNull();
      }
    }
  });

  it('ships sample files with valid headers', () => {
    expect(SAMPLE_FILES.jpeg[0]).toBe(0xff);
    expect(UPLOAD_FIXTURES.some((fixture) => fixture.body === null)).toBe(true);
  });
});
