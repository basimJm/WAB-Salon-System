import { S3Storage } from '../src/adapters/s3';
import { ERROR_CODES } from '../src/constants/codes';
import { DEFAULT_RETRY } from '../src/constants/defaults';
import { noopLogger } from '../src/logger';
import { createStorage } from '../src/storage';
import { FakeS3 } from './fakeS3';
import { FILES, fixedClock, memoryOptions } from './helpers';

const settings = {
  cdnBaseUrl: 'https://cdn.test',
  uploadMaxTtlSec: 300,
  signedUrlMaxTtlSec: 600,
  readMaxBytes: 1_000,
  timeoutMs: 1_000,
  retry: { ...DEFAULT_RETRY, maxAttempts: 3 },
  publicCacheControl: 'public, max-age=1',
  logger: noopLogger,
  s3: { region: 'r', publicBucket: 'pub', privateBucket: 'priv', forcePathStyle: false },
};
const retryDeps = { sleep: () => Promise.resolve(), random: () => 0.5 };
const setup = (): { s3: FakeS3; store: S3Storage; clock: ReturnType<typeof fixedClock> } => {
  const s3 = new FakeS3();
  const clock = fixedClock();
  const store = new S3Storage(settings, {
    loadDeps: () => Promise.resolve(s3.deps()),
    retryDeps,
    now: clock.now,
  });
  return { s3, store, clock };
};
const upload = {
  key: 'salons/1/cover.jpg',
  visibility: 'PUBLIC' as const,
  contentType: 'image/jpeg',
  maxBytes: 1_000,
  expiresInSec: 60,
};
const confirmBase = {
  key: upload.key,
  visibility: upload.visibility,
  contentType: upload.contentType,
  maxBytes: upload.maxBytes,
};
const http = (name: string, status: number): Error =>
  Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } });

describe('S3Storage.createUploadUrl', () => {
  it('presigns a PUT pinned to the content type in the right bucket', async () => {
    const { s3, store } = setup();
    const target = await store.createUploadUrl(upload);
    expect(target).toMatchObject({
      url: 'https://s3.test/pub/salons/1/cover.jpg?X-Amz-Expires=60',
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      expiresAt: new Date('2026-10-18T10:01:00.000Z'),
    });
    expect(s3.presigned[0]).toMatchObject({ expiresIn: 60, headers: ['content-type'] });
    expect(s3.presigned[0]?.input).toMatchObject({ ContentType: 'image/jpeg' });
    await store.createUploadUrl({ ...upload, visibility: 'PRIVATE' });
    expect(s3.presigned[1]?.input['Bucket']).toBe('priv');
  });
  it('validates input and maps presign failures', async () => {
    const { store } = setup();
    await expect(store.createUploadUrl({ ...upload, key: '../x' })).rejects.toMatchObject({
      code: ERROR_CODES.KEY_INVALID,
    });
    await expect(store.createUploadUrl({ ...upload, expiresInSec: 301 })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
    const s3 = new FakeS3();
    const deps = s3.deps();
    const broken = new S3Storage(settings, {
      loadDeps: () =>
        Promise.resolve({
          ...deps,
          presign: () => Promise.reject(http('CredentialsProviderError', 0)),
        }),
      retryDeps,
    });
    await expect(broken.createUploadUrl(upload)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_FAILED,
    });
  });
});

describe('S3Storage.confirmUpload', () => {
  it('confirms a matching object using only the first bytes', async () => {
    const { s3, store } = setup();
    s3.put('pub', upload.key, FILES.jpeg);
    await expect(store.confirmUpload(confirmBase)).resolves.toEqual({
      status: 'CONFIRMED',
      size: FILES.jpeg.length,
      contentType: 'image/jpeg',
    });
    expect(s3.calls.find((c) => c.type === 'Get')?.input['Range']).toBe('bytes=0-31');
  });
  it('rejects a missing object without deleting anything', async () => {
    const { s3, store } = setup();
    await expect(store.confirmUpload(confirmBase)).resolves.toEqual({
      status: 'REJECTED',
      reason: 'NOT_FOUND',
    });
    expect(s3.count('DeleteObjects')).toBe(0);
  });
  it.each([
    ['TYPE_MISMATCH', FILES.png],
    ['TYPE_MISMATCH', FILES.text],
    ['EMPTY', Buffer.alloc(0)],
    ['TOO_LARGE', Buffer.concat([FILES.jpeg, Buffer.alloc(2_000)])],
  ])('rejects %s and deletes the object', async (reason, body) => {
    const { s3, store } = setup();
    s3.put('pub', upload.key, body);
    await expect(store.confirmUpload(confirmBase)).resolves.toEqual({ status: 'REJECTED', reason });
    expect(s3.bucket('pub').has(upload.key)).toBe(false);
    expect(s3.count('Get')).toBe(reason === 'TYPE_MISMATCH' ? 1 : 0);
  });
  it('treats an object that vanishes between HEAD and GET as a type mismatch', async () => {
    const { s3, store } = setup();
    s3.put('pub', upload.key, FILES.jpeg);
    s3.failNext('Get', http('NoSuchKey', 404));
    await expect(store.confirmUpload(confirmBase)).resolves.toMatchObject({
      status: 'REJECTED',
      reason: 'TYPE_MISMATCH',
    });
  });
  it('looks in the bucket of the requested visibility', async () => {
    const { s3, store } = setup();
    s3.put('priv', upload.key, FILES.jpeg);
    await expect(store.confirmUpload(confirmBase)).resolves.toMatchObject({ reason: 'NOT_FOUND' });
    await expect(
      store.confirmUpload({ ...confirmBase, visibility: 'PRIVATE' }),
    ).resolves.toMatchObject({ status: 'CONFIRMED' });
  });
  it.each([null, -1, 1.5, Number.NaN])('fails on a malformed HEAD size (%s)', async (size) => {
    const { s3, store } = setup();
    s3.put('pub', upload.key, FILES.jpeg);
    s3.headSize = size;
    await expect(store.confirmUpload(confirmBase)).rejects.toMatchObject({
      code: ERROR_CODES.MALFORMED_RESPONSE,
    });
  });
  it('fails on a GET without a body and on a broken body stream', async () => {
    const { s3 } = setup();
    s3.put('pub', upload.key, FILES.jpeg);
    const deps = s3.deps();
    const noBody = new S3Storage(settings, {
      loadDeps: () =>
        Promise.resolve({
          ...deps,
          send: (c, s) => (c.input['Range'] ? Promise.resolve({}) : deps.send(c, s)),
        }),
      retryDeps,
    });
    await expect(noBody.confirmUpload(confirmBase)).rejects.toMatchObject({
      code: ERROR_CODES.MALFORMED_RESPONSE,
    });
    const broken = new S3Storage(settings, {
      loadDeps: () =>
        Promise.resolve({
          ...deps,
          send: (c, s) =>
            c.input['Range']
              ? Promise.resolve({
                  Body: {
                    transformToByteArray: () =>
                      Promise.reject(Object.assign(new Error('x'), { code: 'ECONNRESET' })),
                  },
                })
              : deps.send(c, s),
        }),
      retryDeps,
    });
    await expect(broken.confirmUpload(confirmBase)).rejects.toMatchObject({
      code: ERROR_CODES.NETWORK_ERROR,
    });
  });
});

describe('S3Storage urls', () => {
  it('builds CDN URLs without any call', () => {
    const { s3, store } = setup();
    expect(store.getPublicUrl('a/b.jpg')).toBe('https://cdn.test/a/b.jpg');
    expect(() => store.getPublicUrl('../x')).toThrow();
    expect(s3.calls).toHaveLength(0);
  });
  it('presigns GET for the private bucket and validates the ttl', async () => {
    const { s3, store } = setup();
    await expect(store.getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 120 })).resolves.toBe(
      'https://s3.test/priv/docs/l.pdf?X-Amz-Expires=120',
    );
    expect(s3.presigned[0]?.headers).toBeUndefined();
    await expect(
      store.getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 601 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });
});

describe('S3Storage read / write / delete', () => {
  it('reads from the public bucket, then the private one, else null', async () => {
    const { s3, store } = setup();
    await expect(store.read('a/b')).resolves.toBeNull();
    s3.put('priv', 'a/b', FILES.pdf);
    await expect(store.read('a/b')).resolves.toEqual(FILES.pdf);
    s3.put('pub', 'a/b', FILES.png);
    await expect(store.read('a/b')).resolves.toEqual(FILES.png);
    await expect(store.read('..')).rejects.toMatchObject({ code: ERROR_CODES.KEY_INVALID });
  });
  it('refuses objects above the read limit', async () => {
    const { s3, store } = setup();
    s3.put('pub', 'big/one', Buffer.alloc(1_001, 1));
    await expect(store.read('big/one')).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
  });
  it('writes with cache headers on public objects only', async () => {
    const { s3, store } = setup();
    await store.write({
      key: 'v/thumb.webp',
      body: FILES.webp,
      contentType: 'image/webp',
      visibility: 'PUBLIC',
    });
    await store.write({
      key: 'v/private.pdf',
      body: FILES.pdf,
      contentType: 'application/pdf',
      visibility: 'PRIVATE',
    });
    const [pub, priv] = s3.calls.map((c) => c.input);
    expect(pub).toMatchObject({
      Bucket: 'pub',
      CacheControl: 'public, max-age=1',
      ContentLength: FILES.webp.length,
    });
    expect(priv?.['CacheControl']).toBeUndefined();
    expect(priv?.['Bucket']).toBe('priv');
    await expect(
      store.write({
        key: 'v/x',
        body: 'x' as never,
        contentType: 'image/png',
        visibility: 'PUBLIC',
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });
  it('deletes from both buckets, de-duplicated and batched by 1000', async () => {
    const { s3, store } = setup();
    s3.put('pub', 'k0', FILES.png);
    await store.delete([]);
    expect(s3.calls).toHaveLength(0);
    const keys = Array.from({ length: 2_500 }, (_, i) => `k${String(i)}`);
    await store.delete([...keys, 'k0']);
    const batches = s3.calls.map(
      (c) => (c.input['Delete'] as { Objects: unknown[] }).Objects.length,
    );
    expect(batches).toEqual([1_000, 1_000, 500, 1_000, 1_000, 500]);
    expect(s3.bucket('pub').has('k0')).toBe(false);
    await expect(store.delete(['..'])).rejects.toMatchObject({ code: ERROR_CODES.KEY_INVALID });
  });
  it('ignores already-missing keys but reports real partial failures', async () => {
    const { s3, store } = setup();
    s3.deleteErrors = [{ Key: 'a/b', Code: 'NoSuchKey' }];
    await expect(store.delete(['a/b'])).resolves.toBeUndefined();
    s3.deleteErrors = [{ Key: 'a/b', Code: 'AccessDenied' }, { Key: 'a/c' }];
    await expect(store.delete(['a/b', 'a/c'])).rejects.toMatchObject({
      code: ERROR_CODES.VENDOR_ERROR,
      details: { failed: 4, codes: ['AccessDenied', ERROR_CODES.UNKNOWN] },
    });
  });
});

describe('S3Storage resilience', () => {
  it('retries retryable failures and then succeeds', async () => {
    const { s3, store } = setup();
    s3.put('pub', 'a/b', FILES.png);
    s3.failNext('Get', http('SlowDown', 503), http('InternalError', 500));
    await expect(store.read('a/b')).resolves.toEqual(FILES.png);
    expect(s3.count('Get')).toBe(3);
  });
  it('gives up after maxAttempts with a typed error', async () => {
    const { s3, store } = setup();
    s3.failNext('Get', http('SlowDown', 503), http('SlowDown', 503), http('SlowDown', 503));
    await expect(store.read('a/b')).rejects.toMatchObject({
      code: ERROR_CODES.RATE_LIMITED,
      retryable: true,
    });
    expect(s3.count('Get')).toBe(3);
  });
  it('does not retry permanent failures', async () => {
    const { s3, store } = setup();
    s3.failNext('Put', http('AccessDenied', 403));
    await expect(
      store.write({ key: 'a/b', body: FILES.png, contentType: 'image/png', visibility: 'PUBLIC' }),
    ).rejects.toMatchObject({ code: ERROR_CODES.ACCESS_DENIED });
    expect(s3.count('Put')).toBe(1);
  });
  it('reports an unloadable AWS SDK as a config error and tries again next time', async () => {
    let attempts = 0;
    const s3 = new FakeS3();
    const store = new S3Storage(settings, {
      loadDeps: () =>
        ++attempts === 1
          ? Promise.reject(new Error('Cannot find module'))
          : Promise.resolve(s3.deps()),
      retryDeps,
    });
    await expect(store.read('a/b')).rejects.toMatchObject({ code: ERROR_CODES.CONFIG_INVALID });
    await expect(store.read('a/b')).resolves.toBeNull();
    expect(attempts).toBe(2);
  });
  it('uses the real clock by default', async () => {
    const s3 = new FakeS3();
    const store = new S3Storage(settings, { loadDeps: () => Promise.resolve(s3.deps()) });
    const target = await store.createUploadUrl(upload);
    expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('createStorage with s3', () => {
  it('builds the s3 provider', () => {
    const provider = createStorage(
      memoryOptions({ provider: 's3', s3: { region: 'r', publicBucket: 'a', privateBucket: 'b' } }),
    );
    expect(provider).toBeInstanceOf(S3Storage);
  });
});
