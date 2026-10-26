import { MS_PER_SECOND } from '../src/constants/time';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import { FakeOtpProvider } from '../src/providers/otp';
import { FakeNotifier } from '../src/providers/notifier';
import { DisabledPaymentProvider, FakePaymentProvider } from '../src/providers/payments';
import { FakeStorageProvider } from '../src/providers/storage';
import { normalizeError } from '../src/utils/errors/normalize';

describe('fake storage provider', () => {
  const T0 = new Date('2026-10-12T10:00:00.000Z');
  let clock = T0.getTime();
  const make = (): FakeStorageProvider => {
    clock = T0.getTime();
    return new FakeStorageProvider({ now: () => new Date(clock) });
  };
  const request = {
    key: 'salons/64b7f0f2a1b2c3d4e5f60718/cover.jpg',
    visibility: 'PUBLIC' as const,
    contentType: 'image/jpeg',
    maxBytes: 1000,
    expiresInSec: 300,
  };
  const confirm = {
    key: request.key,
    visibility: request.visibility,
    contentType: request.contentType,
    maxBytes: request.maxBytes,
  };

  it('issues a PUT target that expires after the requested time and pins the content type', async () => {
    const storage = make();
    const target = await storage.createUploadUrl(request);
    expect(target.method).toBe('PUT');
    expect(target.url.endsWith('/salons/64b7f0f2a1b2c3d4e5f60718/cover.jpg')).toBe(true);
    expect(target.headers).toEqual({ 'Content-Type': 'image/jpeg' });
    expect(target.expiresAt.getTime()).toBe(T0.getTime() + 300 * MS_PER_SECOND);
  });

  it('confirms an upload that matches type and size, and reports the stored facts', async () => {
    const storage = make();
    await storage.createUploadUrl(request);
    expect(storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 900 })).toBe(
      true,
    );
    await expect(storage.confirmUpload(confirm)).resolves.toEqual({
      status: 'CONFIRMED',
      size: 900,
      contentType: 'image/jpeg',
    });
    expect(storage.has(request.key)).toBe(true);
  });

  it('accepts a file exactly at the size limit', async () => {
    const storage = make();
    await storage.createUploadUrl(request);
    storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 1000 });
    await expect(storage.confirmUpload(confirm)).resolves.toMatchObject({ status: 'CONFIRMED' });
  });

  it('rejects and deletes an object that is too large', async () => {
    const storage = make();
    await storage.createUploadUrl(request);
    storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 1001 });
    await expect(storage.confirmUpload(confirm)).resolves.toEqual({
      status: 'REJECTED',
      reason: 'TOO_LARGE',
    });
    expect(storage.has(request.key)).toBe(false);
  });

  it('rejects and deletes an object whose real type differs from the declared one', async () => {
    const storage = make();
    await storage.createUploadUrl(request);
    storage.simulateUpload(request.key, { contentType: 'application/x-msdownload', size: 10 });
    await expect(storage.confirmUpload(confirm)).resolves.toEqual({
      status: 'REJECTED',
      reason: 'TYPE_MISMATCH',
    });
    expect(storage.has(request.key)).toBe(false);
  });

  it('says NOT_FOUND when nothing was uploaded or the visibility differs', async () => {
    const storage = make();
    await storage.createUploadUrl(request);
    await expect(storage.confirmUpload(confirm)).resolves.toEqual({
      status: 'REJECTED',
      reason: 'NOT_FOUND',
    });
    storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 10 });
    await expect(storage.confirmUpload({ ...confirm, visibility: 'PRIVATE' })).resolves.toEqual({
      status: 'REJECTED',
      reason: 'NOT_FOUND',
    });
  });

  it('refuses an upload without a URL, with an expired URL, and at the exact expiry', async () => {
    const storage = make();
    expect(storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 1 })).toBe(false);
    await storage.createUploadUrl(request);
    clock = T0.getTime() + 300 * MS_PER_SECOND - 1;
    expect(storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 1 })).toBe(true);
    clock = T0.getTime() + 300 * MS_PER_SECOND;
    expect(storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 1 })).toBe(false);
  });

  it('builds CDN URLs for public keys and refuses them for private objects', async () => {
    const storage = make();
    expect(storage.getPublicUrl('a/b_c.jpg')).toMatch(/^https:\/\/.+\/a\/b_c\.jpg$/);
    await storage.createUploadUrl({ ...request, key: 'licenses/doc.pdf', visibility: 'PRIVATE' });
    expect(() => storage.getPublicUrl('licenses/doc.pdf')).toThrow(RangeError);
  });

  it('signs private URLs that carry the expiry', async () => {
    const storage = make();
    const url = await storage.getSignedUrl({ key: 'licenses/doc.pdf', expiresInSec: 600 });
    expect(url).toContain('/private/licenses/doc.pdf');
    expect(url).toContain(`expires=${String(T0.getTime() + 600 * MS_PER_SECOND)}`);
    expect(url).toContain('signature=');
  });

  it('deletes uploaded and pending objects and ignores unknown keys', async () => {
    const storage = make();
    await storage.createUploadUrl(request);
    storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 1 });
    await storage.delete([request.key, 'never/existed.png']);
    expect(storage.has(request.key)).toBe(false);
    expect(storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 1 })).toBe(false);
  });

  it.each([
    '',
    '/abs.jpg',
    'a//b.jpg',
    'a/../b.jpg',
    'a/./b.jpg',
    '../x',
    'a/b/',
    'a b.jpg',
    'é.jpg',
  ])('rejects the object key %j everywhere', async (key) => {
    const storage = make();
    await expect(storage.createUploadUrl({ ...request, key })).rejects.toBeInstanceOf(RangeError);
    await expect(storage.confirmUpload({ ...confirm, key })).rejects.toBeInstanceOf(RangeError);
    expect(() => storage.getPublicUrl(key)).toThrow(RangeError);
    await expect(storage.getSignedUrl({ key, expiresInSec: 60 })).rejects.toBeInstanceOf(
      RangeError,
    );
    await expect(storage.delete([key])).rejects.toBeInstanceOf(RangeError);
  });

  it.each([
    { contentType: 'jpeg' },
    { contentType: 'IMAGE/JPEG' },
    { contentType: '' },
    { maxBytes: 0 },
    { maxBytes: 1.5 },
    { maxBytes: -1 },
    { expiresInSec: 0 },
    { expiresInSec: 604_801 },
    { expiresInSec: 0.5 },
  ])('rejects bad upload parameters %j', async (override) => {
    await expect(make().createUploadUrl({ ...request, ...override })).rejects.toBeInstanceOf(
      RangeError,
    );
  });

  it('limits the key length exactly at 1024 characters', async () => {
    const storage = make();
    const longest = `${'a'.repeat(1020)}.jpg`;
    await expect(storage.createUploadUrl({ ...request, key: longest })).resolves.toBeDefined();
    await expect(
      storage.createUploadUrl({ ...request, key: `a${longest}` }),
    ).rejects.toBeInstanceOf(RangeError);
  });

  it('allows the longest S3 validity exactly', async () => {
    await expect(
      make().createUploadUrl({ ...request, expiresInSec: 604_800 }),
    ).resolves.toBeDefined();
  });

  it('does not touch anything when one key of a bulk delete is invalid', async () => {
    const storage = make();
    await storage.createUploadUrl(request);
    storage.simulateUpload(request.key, { contentType: 'image/jpeg', size: 1 });
    await expect(storage.delete([request.key, '../bad'])).rejects.toBeInstanceOf(RangeError);
    expect(storage.has(request.key)).toBe(true);
  });
});

const ALL_FAKE = {
  otp: 'fake',
  storage: 'fake',
  notifier: 'fake',
  payments: 'fake',
} as const;

describe('createProviders', () => {
  it('builds every fake outside production', () => {
    const providers = createProviders(ALL_FAKE, false);
    expect(providers.otp).toBeInstanceOf(FakeOtpProvider);
    expect(providers.storage).toBeInstanceOf(FakeStorageProvider);
    expect(providers.notifier).toBeInstanceOf(FakeNotifier);
    expect(providers.payments).toBeInstanceOf(FakePaymentProvider);
  });

  it('refuses fakes in production even if the config check was bypassed', () => {
    expect(() => createProviders(ALL_FAKE, true)).toThrow(ProviderUnavailableError);
  });

  it('refuses a fake payment gateway in production and builds the disabled one anywhere', () => {
    const real = { ...ALL_FAKE, otp: 'arqam', storage: 'real', notifier: 'real' } as const;
    const failure = (() => {
      try {
        createProviders(real, true);
      } catch (error) {
        return error;
      }
      return null;
    })();
    expect(failure).toBeInstanceOf(ProviderUnavailableError);
    expect(createProviders({ ...ALL_FAKE, payments: 'disabled' }, false).payments).toBeInstanceOf(
      DisabledPaymentProvider,
    );
  });

  it.each([
    ['otp', 'arqam'],
    ['storage', 'real'],
    ['notifier', 'real'],
  ] as const)('fails loudly when %s is %s without its runtime dependencies', (name, mode) => {
    const failure = (() => {
      try {
        createProviders({ ...ALL_FAKE, [name]: mode }, false);
      } catch (error) {
        return error;
      }
      return null;
    })();
    expect(failure).toBeInstanceOf(ProviderUnavailableError);
    expect((failure as ProviderUnavailableError).provider).toBe(name);
    expect(normalizeError(failure).httpStatus).toBe(500);
  });
});
