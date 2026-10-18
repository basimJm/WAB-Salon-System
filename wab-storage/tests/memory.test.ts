import { MemoryStorage } from '../src/adapters/memory';
import { ERROR_CODES } from '../src/constants/codes';
import { createStorage } from '../src/storage';
import { FILES, fixedClock, memoryOptions } from './helpers';

const config = { cdnBaseUrl: 'http://cdn.test', uploadMaxTtlSec: 300, signedUrlMaxTtlSec: 600 };
const make = (): { store: MemoryStorage; clock: ReturnType<typeof fixedClock> } => {
  const clock = fixedClock();
  return { store: new MemoryStorage(config, clock.now), clock };
};
const request = {
  key: 'salons/1/cover.jpg',
  visibility: 'PUBLIC' as const,
  contentType: 'image/jpeg',
  maxBytes: 1_000,
  expiresInSec: 60,
};
const confirmBase = {
  key: request.key,
  visibility: request.visibility,
  contentType: request.contentType,
  maxBytes: request.maxBytes,
};

describe('MemoryStorage upload + confirm', () => {
  it('presigns, accepts the upload and confirms by content', async () => {
    const { store } = make();
    const target = await store.createUploadUrl(request);
    expect(target).toMatchObject({
      method: 'PUT',
      url: 'http://cdn.test/__upload/salons/1/cover.jpg',
      headers: { 'Content-Type': 'image/jpeg' },
      expiresAt: new Date('2026-10-18T10:01:00.000Z'),
    });
    expect(store.simulateUpload(request.key, FILES.jpeg)).toBe(true);
    await expect(store.confirmUpload(confirmBase)).resolves.toEqual({
      status: 'CONFIRMED',
      size: FILES.jpeg.length,
      contentType: 'image/jpeg',
    });
    expect(store.has(request.key)).toBe(true);
  });
  it('refuses uploads without a valid or after an expired URL', async () => {
    const { store, clock } = make();
    expect(store.simulateUpload('a/b', FILES.jpeg)).toBe(false);
    await store.createUploadUrl(request);
    clock.advance(60_000);
    expect(store.simulateUpload(request.key, FILES.jpeg)).toBe(false);
  });
  it('rejects and deletes missing-type, wrong type, empty and too large objects', async () => {
    const { store } = make();
    await expect(store.confirmUpload(confirmBase)).resolves.toEqual({
      status: 'REJECTED',
      reason: 'NOT_FOUND',
    });
    const cases: [Buffer, string][] = [
      [FILES.png, 'TYPE_MISMATCH'],
      [FILES.text, 'TYPE_MISMATCH'],
      [Buffer.alloc(0), 'EMPTY'],
      [Buffer.concat([FILES.jpeg, Buffer.alloc(2_000)]), 'TOO_LARGE'],
    ];
    for (const [body, reason] of cases) {
      await store.createUploadUrl(request);
      store.simulateUpload(request.key, body);
      await expect(store.confirmUpload(confirmBase)).resolves.toEqual({
        status: 'REJECTED',
        reason,
      });
      expect(store.has(request.key)).toBe(false);
    }
  });
  it('treats a visibility mismatch as not found', async () => {
    const { store } = make();
    await store.createUploadUrl(request);
    store.simulateUpload(request.key, FILES.jpeg);
    await expect(store.confirmUpload({ ...confirmBase, visibility: 'PRIVATE' })).resolves.toEqual({
      status: 'REJECTED',
      reason: 'NOT_FOUND',
    });
  });
  it('rejects invalid arguments as typed errors', async () => {
    const { store } = make();
    await expect(store.createUploadUrl({ ...request, key: '../x' })).rejects.toMatchObject({
      code: ERROR_CODES.KEY_INVALID,
    });
    await expect(store.createUploadUrl({ ...request, expiresInSec: 301 })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
    await expect(store.confirmUpload({ ...confirmBase, maxBytes: 0 })).rejects.toBeInstanceOf(
      Error,
    );
  });
});

describe('MemoryStorage urls, read, write, delete', () => {
  it('builds public URLs and refuses private objects', async () => {
    const { store } = make();
    expect(store.getPublicUrl('a/b.jpg')).toBe('http://cdn.test/a/b.jpg');
    await store.write({
      key: 'docs/l.pdf',
      body: FILES.pdf,
      contentType: 'application/pdf',
      visibility: 'PRIVATE',
    });
    expect(() => store.getPublicUrl('docs/l.pdf')).toThrow(RangeError);
    expect(() => store.getPublicUrl('../x')).toThrow();
  });
  it('signs URLs with an expiry and validates the ttl', async () => {
    const { store } = make();
    const url = await store.getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 60 });
    expect(url).toBe(
      `http://cdn.test/private/docs/l.pdf?expires=${String(Date.parse('2026-10-18T10:01:00.000Z'))}&signature=memory`,
    );
    await expect(
      store.getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 601 }),
    ).rejects.toBeInstanceOf(Error);
  });
  it('writes, reads and deletes (missing keys ignored)', async () => {
    const { store } = make();
    await expect(store.read('x/y')).resolves.toBeNull();
    await store.write({
      key: 'x/y',
      body: FILES.png,
      contentType: 'image/png',
      visibility: 'PUBLIC',
    });
    await expect(store.read('x/y')).resolves.toEqual(FILES.png);
    await store.createUploadUrl({ ...request, key: 'p/q' });
    await store.delete(['x/y', 'p/q', 'missing/key']);
    expect(store.size).toBe(0);
    expect(store.simulateUpload('p/q', FILES.jpeg)).toBe(false);
    await expect(store.delete(['..'])).rejects.toMatchObject({ code: ERROR_CODES.KEY_INVALID });
  });
  it('rejects invalid writes', async () => {
    const { store } = make();
    await expect(
      store.write({
        key: 'a/b',
        body: 'x' as never,
        contentType: 'image/png',
        visibility: 'PUBLIC',
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });
  it('wraps non-Error throws', async () => {
    const { store } = make();
    const bad = {
      ...request,
      get key(): string {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'boom';
      },
    };
    await expect(store.createUploadUrl(bad)).rejects.toThrow('boom');
  });
  it('defaults to the real clock', async () => {
    const store = new MemoryStorage(config);
    const target = await store.createUploadUrl(request);
    expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('createStorage', () => {
  it('builds the memory provider', () => {
    expect(createStorage(memoryOptions())).toBeInstanceOf(MemoryStorage);
  });
  it('rejects unavailable providers with a config error', () => {
    expect(() =>
      createStorage({
        ...memoryOptions(),
        provider: 's3',
        s3: { region: 'r', publicBucket: 'a', privateBucket: 'b' },
      }),
    ).toThrow(expect.objectContaining({ code: ERROR_CODES.CONFIG_INVALID }) as Error);
  });
});
