import { createAwsDeps } from '../src/adapters/s3/deps';
import { ERROR_CODES } from '../src/constants/codes';
import { createStorage } from '../src/storage';
import type { StorageProvider } from '../src/types';
import { MiniS3 } from './miniS3';
import { FILES, memoryOptions } from './helpers';

/** Real AWS SDK against a local S3 wire emulator: proves signing, XML and error handling. */
const s3 = new MiniS3();
beforeAll(async () => {
  await s3.start();
});
afterAll(async () => {
  await s3.stop();
});
beforeEach(() => {
  s3.buckets.clear();
  s3.failures.length = 0;
  s3.requests.length = 0;
});

const build = (endpoint = s3.endpoint): StorageProvider =>
  createStorage(
    memoryOptions({
      provider: 's3',
      s3: {
        region: 'eu-central-1',
        publicBucket: 'pub',
        privateBucket: 'priv',
        endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId: 'test-key-id', secretAccessKey: 'test-secret-value' },
      },
      timeoutMs: 1_000,
      retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2, jitterRatio: 0 },
    }),
  );

const upload = {
  key: 'salons/1/cover.jpg',
  visibility: 'PUBLIC' as const,
  contentType: 'image/jpeg',
  maxBytes: 1_000,
  expiresInSec: 60,
};

describe('real AWS SDK against the S3 wire emulator', () => {
  it('presigned PUT is pinned to the content type; upload → confirm → read → delete', async () => {
    const store = build();
    const target = await store.createUploadUrl(upload);
    const url = new URL(target.url);
    expect(url.pathname).toBe('/pub/salons/1/cover.jpg');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    const put = await fetch(target.url, {
      method: 'PUT',
      body: new Uint8Array(FILES.jpeg),
      headers: target.headers,
    });
    expect(put.status).toBe(200);
    await expect(
      store.confirmUpload({
        key: upload.key,
        visibility: 'PUBLIC',
        contentType: 'image/jpeg',
        maxBytes: 1_000,
      }),
    ).resolves.toEqual({ status: 'CONFIRMED', size: FILES.jpeg.length, contentType: 'image/jpeg' });
    await expect(store.read(upload.key)).resolves.toEqual(FILES.jpeg);
    await store.delete([upload.key]);
    await expect(store.read(upload.key)).resolves.toBeNull();
  });

  it('signs private GET URLs that the emulator can serve', async () => {
    const store = build();
    await store.write({
      key: 'docs/l.pdf',
      body: FILES.pdf,
      contentType: 'application/pdf',
      visibility: 'PRIVATE',
    });
    const url = await store.getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 120 });
    expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('120');
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(FILES.pdf);
  });

  it('rejects wrong content, deleting it', async () => {
    const store = build();
    await store.write({
      key: 'a/fake.jpg',
      body: FILES.text,
      contentType: 'image/jpeg',
      visibility: 'PUBLIC',
    });
    await expect(
      store.confirmUpload({
        key: 'a/fake.jpg',
        visibility: 'PUBLIC',
        contentType: 'image/jpeg',
        maxBytes: 1_000,
      }),
    ).resolves.toEqual({ status: 'REJECTED', reason: 'TYPE_MISMATCH' });
    expect(s3.bucket('pub').has('a/fake.jpg')).toBe(false);
    await expect(
      store.confirmUpload({
        key: 'a/none.jpg',
        visibility: 'PUBLIC',
        contentType: 'image/jpeg',
        maxBytes: 1_000,
      }),
    ).resolves.toEqual({ status: 'REJECTED', reason: 'NOT_FOUND' });
  });

  it('retries SlowDown / 5xx answers from the wire and maps permanent ones', async () => {
    const store = build();
    s3.bucket('pub').set('x/y', { body: FILES.png, contentType: 'image/png' });
    s3.failures.push([503, 'SlowDown'], [500, 'InternalError']);
    await expect(store.read('x/y')).resolves.toEqual(FILES.png);
    s3.failures.push([403, 'AccessDenied']);
    await expect(store.read('x/y')).rejects.toMatchObject({ code: ERROR_CODES.ACCESS_DENIED });
    s3.failures.push([404, 'NoSuchBucket']);
    await expect(
      store.write({ key: 'x/z', body: FILES.png, contentType: 'image/png', visibility: 'PUBLIC' }),
    ).rejects.toMatchObject({ code: ERROR_CODES.CONFIG_INVALID });
    s3.failures.push([503, 'SlowDown'], [503, 'SlowDown'], [503, 'SlowDown']);
    await expect(store.read('x/y')).rejects.toMatchObject({ code: ERROR_CODES.RATE_LIMITED });
  });

  it('maps a dead endpoint to a retryable network error', async () => {
    const dead = build('http://127.0.0.1:1');
    await expect(dead.read('a/b')).rejects.toMatchObject({
      code: ERROR_CODES.NETWORK_ERROR,
      retryable: true,
    });
  });

  it('presigns locally without any network call', async () => {
    const offline = build('http://127.0.0.1:1');
    const target = await offline.createUploadUrl(upload);
    expect(target.url).toContain('127.0.0.1:1/pub/salons/1/cover.jpg');
  });

  it('creates the AWS deps for AWS itself (no endpoint, role credentials)', async () => {
    const deps = await createAwsDeps(
      {
        region: 'eu-central-1',
        publicBucket: 'a',
        privateBucket: 'b',
        forcePathStyle: false,
        credentials: { accessKeyId: 'k', secretAccessKey: 's', sessionToken: 't' },
      },
      1_000,
    );
    const url = await deps.presign(new deps.commands.Get({ Bucket: 'b', Key: 'k' }), {
      expiresIn: 30,
    });
    expect(url).toContain('s3.eu-central-1.amazonaws.com/b/k');
    expect(url).toContain('X-Amz-Security-Token=t');
    const roleDeps = await createAwsDeps(
      { region: 'eu-central-1', publicBucket: 'a', privateBucket: 'b', forcePathStyle: false },
      1_000,
    );
    expect(roleDeps.commands.Head).toBeDefined();
  });
});
