import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalFsStorage, mapFsError } from '../src/adapters/localFs';
import { createLocalFsHandler } from '../src/adapters/localFsHttp';
import { ERROR_CODES } from '../src/constants/codes';
import { StorageError } from '../src/errors';
import { createLocalFsStorage, createStorage } from '../src/storage';
import { FILES, fixedClock, memoryOptions } from './helpers';

let root: string;
let server: Server;
let base: string;
let clock: ReturnType<typeof fixedClock>;
let store: LocalFsStorage;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'wab-storage-test-'));
  clock = fixedClock();
  const handler = (): ((req: never, res: never) => Promise<boolean>) => async (req, res) => {
    const handled = await createLocalFsHandler(store)(req, res);
    if (!handled) (res as { writeHead: (s: number) => void; end: () => void }).writeHead(418);
    if (!handled) (res as { end: () => void }).end();
    return handled;
  };
  server = createServer((req, res) => {
    void handler()(req as never, res as never);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  store = new LocalFsStorage(
    {
      cdnBaseUrl: base,
      uploadMaxTtlSec: 300,
      signedUrlMaxTtlSec: 600,
      localFs: { rootDir: root, baseUrl: base },
    },
    clock.now,
  );
});
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});

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
const put = (url: string, body: Buffer, type = 'image/jpeg'): Promise<Response> =>
  fetch(url, { method: 'PUT', body: new Uint8Array(body), headers: { 'Content-Type': type } });

describe('LocalFsStorage + HTTP helper end to end', () => {
  it('presigned PUT → confirm → public GET', async () => {
    const target = await store.createUploadUrl(request);
    expect(target.url).toBe(`${base}/__upload/salons/1/cover.jpg`);
    expect((await put(target.url, FILES.jpeg)).status).toBe(200);
    await expect(store.confirmUpload(confirmBase)).resolves.toMatchObject({ status: 'CONFIRMED' });
    const served = await fetch(store.getPublicUrl(request.key));
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/jpeg');
    expect(Buffer.from(await served.arrayBuffer())).toEqual(FILES.jpeg);
    expect(served.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('refuses uploads without permission, after expiry, with a wrong type or too large', async () => {
    const url = `${base}/__upload/${request.key}`;
    expect((await put(url, FILES.jpeg)).status).toBe(403);
    await store.createUploadUrl(request);
    expect((await put(url, FILES.jpeg, 'image/png')).status).toBe(415);
    expect((await put(url, Buffer.alloc(1_001, 1))).status).toBe(413);
    clock.advance(61_000);
    expect((await put(url, FILES.jpeg)).status).toBe(403);
    expect((await fetch(`${base}/__upload/..%2Fx`, { method: 'PUT' })).status).toBe(404);
  });
  it('rejects and deletes wrong, empty and oversized stored content on confirm', async () => {
    await expect(store.confirmUpload(confirmBase)).resolves.toEqual({
      status: 'REJECTED',
      reason: 'NOT_FOUND',
    });
    const cases: [Buffer, string][] = [
      [FILES.png, 'TYPE_MISMATCH'],
      [Buffer.alloc(0), 'EMPTY'],
      [Buffer.concat([FILES.jpeg, Buffer.alloc(2_000)]), 'TOO_LARGE'],
    ];
    for (const [body, reason] of cases) {
      await store.write({ ...confirmBase, body });
      await expect(store.confirmUpload(confirmBase)).resolves.toEqual({
        status: 'REJECTED',
        reason,
      });
      await expect(store.read(request.key)).resolves.toBeNull();
    }
  });
  it('serves private files only through unexpired genuine signed links', async () => {
    await store.write({
      key: 'docs/l.pdf',
      body: FILES.pdf,
      contentType: 'application/pdf',
      visibility: 'PRIVATE',
    });
    expect((await fetch(`${base}/docs/l.pdf`)).status).toBe(404);
    const url = await store.getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 60 });
    const ok = await fetch(url);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('application/pdf');
    expect((await fetch(url.replace(/signature=./, 'signature=0'))).status).toBe(403);
    expect((await fetch(url.replace('l.pdf', 'm.pdf'))).status).toBe(403);
    expect((await fetch(url.replace(/signature=.*/, 'signature='))).status).toBe(403);
    expect((await fetch(`${base}/private/docs/l.pdf`)).status).toBe(403);
    expect((await fetch(`${base}/private/..%2Fx?expires=1&signature=a`)).status).toBe(404);
    const missing = await store.getSignedUrl({ key: 'docs/none.pdf', expiresInSec: 60 });
    expect((await fetch(missing)).status).toBe(404);
    clock.advance(61_000);
    expect((await fetch(url)).status).toBe(403);
  });
  it('serves unknown content as octet-stream and ignores non-storage requests', async () => {
    await store.write({
      key: 'x/raw.bin',
      body: FILES.text,
      contentType: 'text/plain',
      visibility: 'PUBLIC',
    });
    expect((await fetch(`${base}/x/raw.bin`)).headers.get('content-type')).toBe(
      'application/octet-stream',
    );
    expect((await fetch(`${base}/x/missing.bin`)).status).toBe(404);
    expect((await fetch(`${base}/..%2Fsecret`)).status).toBe(404);
    expect((await fetch(`${base}/%E0%A4%A`)).status).toBe(404);
    expect((await fetch(`${base}/`)).status).toBe(418);
    expect((await fetch(base, { method: 'POST' })).status).toBe(418);
  });
  it('answers 500 when the disk fails', async () => {
    await store.createUploadUrl(request);
    await mkdir(join(root, 'PUBLIC', 'salons', '1', 'cover.jpg'), { recursive: true });
    expect((await put(`${base}/__upload/${request.key}`, FILES.jpeg)).status).toBe(500);
  });
});

describe('LocalFsStorage operations', () => {
  it('writes, reads from either location, keeps keys unique and deletes', async () => {
    await expect(store.read('a/b')).resolves.toBeNull();
    await store.write({
      key: 'a/b',
      body: FILES.png,
      contentType: 'image/png',
      visibility: 'PUBLIC',
    });
    await expect(store.locate('a/b')).resolves.toBe('PUBLIC');
    await store.write({
      key: 'a/b',
      body: FILES.png,
      contentType: 'image/png',
      visibility: 'PRIVATE',
    });
    await expect(store.locate('a/b')).resolves.toBe('PRIVATE');
    await expect(store.read('a/b')).resolves.toEqual(FILES.png);
    await store.createUploadUrl({ ...request, key: 'p/q' });
    await store.delete(['a/b', 'p/q', 'never/existed']);
    await expect(store.locate('a/b')).resolves.toBeUndefined();
    expect(store.pendingUpload('p/q')).toBeUndefined();
    expect(await readdir(join(root, 'PRIVATE', 'a'))).toEqual([]);
  });
  it('validates arguments with typed errors', async () => {
    await expect(store.createUploadUrl({ ...request, key: '../x' })).rejects.toMatchObject({
      code: ERROR_CODES.KEY_INVALID,
    });
    await expect(store.getSignedUrl({ key: 'a/b', expiresInSec: 601 })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
    await expect(store.delete(['..'])).rejects.toMatchObject({ code: ERROR_CODES.KEY_INVALID });
    expect(() => store.pathOf('PUBLIC', 'a/../b')).toThrow(StorageError);
    expect(() => store.getPublicUrl('..')).toThrow(StorageError);
  });
  it('rejects signature checks with bad expiry values', () => {
    expect(store.verifySignature('a/b', Number.NaN, 'x')).toBe(false);
    expect(store.verifySignature('a/b', 1, 'x')).toBe(false);
  });
  it('maps disk failures to typed errors and keeps no partial file', async () => {
    await writeFile(join(root, 'PUBLIC'), 'a file where a directory is needed');
    await expect(
      store.write({ key: 'a/b', body: FILES.png, contentType: 'image/png', visibility: 'PUBLIC' }),
    ).rejects.toMatchObject({ code: ERROR_CODES.UNAVAILABLE });
    await expect(store.confirmUpload(confirmBase)).rejects.toMatchObject({
      code: ERROR_CODES.UNAVAILABLE,
    });
    await expect(store.read('a/b')).rejects.toMatchObject({ code: ERROR_CODES.UNAVAILABLE });
    await expect(store.locate('a/b')).rejects.toMatchObject({ code: ERROR_CODES.UNAVAILABLE });
    await expect(store.delete(['a/b'])).rejects.toMatchObject({ code: ERROR_CODES.UNAVAILABLE });
  });
  it('maps filesystem error codes', () => {
    const denied = mapFsError(Object.assign(new Error('x'), { code: 'EACCES' }));
    expect(denied.code).toBe(ERROR_CODES.ACCESS_DENIED);
    expect(mapFsError(Object.assign(new Error('x'), { code: 'EPERM' })).code).toBe(
      ERROR_CODES.ACCESS_DENIED,
    );
    const full = mapFsError(Object.assign(new Error('x'), { code: 'ENOSPC' }));
    expect(full).toMatchObject({ code: ERROR_CODES.UNAVAILABLE, details: { fsCode: 'ENOSPC' } });
    const typed = new StorageError(ERROR_CODES.KEY_INVALID, 'k');
    expect(mapFsError(typed)).toBe(typed);
  });
  it('uses the real clock by default', async () => {
    const real = new LocalFsStorage({
      cdnBaseUrl: base,
      uploadMaxTtlSec: 300,
      signedUrlMaxTtlSec: 600,
      localFs: { rootDir: root, baseUrl: base },
    });
    const target = await real.createUploadUrl(request);
    expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(real.pendingUpload(request.key)).toBeDefined();
  });
});

describe('factory', () => {
  const local = memoryOptions({
    provider: 'local-fs',
    localFs: { rootDir: '/tmp/wab-x', baseUrl: 'http://localhost:3000' },
  });
  it('builds local-fs through createStorage and createLocalFsStorage', () => {
    expect(typeof createStorage(local).createVariants).toBe('function');
    expect(createLocalFsStorage(local)).toBeInstanceOf(LocalFsStorage);
  });
  it('createLocalFsStorage refuses other providers', () => {
    expect(() => createLocalFsStorage(memoryOptions())).toThrow(
      expect.objectContaining({ code: ERROR_CODES.CONFIG_INVALID }) as Error,
    );
  });
});
