import { FAKE_OTP_PROOF_KINDS, OTP_PURPOSES } from '../src/constants/providers';
import { MS_PER_SECOND } from '../src/constants/time';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import { FakeOtpProvider, fakeOtpProof, isE164 } from '../src/providers/otp';
import { FakeStorageProvider } from '../src/providers/storage';
import { ExternalServiceError } from '../src/utils/errors';
import { normalizeError } from '../src/utils/errors/normalize';

const PHONE = '+962791234567';
const OTHER_PHONE = '+962781234567';

describe('isE164', () => {
  it.each(['+962791234567', '+14155552671', '+1234567'])('accepts %s', (value) => {
    expect(isE164(value)).toBe(true);
  });

  it.each([
    '962791234567',
    '+0791234567',
    '+96279',
    '+9627912345678901',
    '0791234567',
    '',
    null,
    5,
  ])('rejects %j', (value) => {
    expect(isE164(value)).toBe(false);
  });
});

describe('fake OTP provider', () => {
  const provider = new FakeOtpProvider();
  const verify = (proof: string, expectedPhone = PHONE): ReturnType<FakeOtpProvider['verify']> =>
    provider.verify({ proof, expectedPhone, purpose: 'LOGIN' });

  it('verifies a valid proof for the expected phone', async () => {
    await expect(verify(fakeOtpProof(PHONE))).resolves.toEqual({
      outcome: 'VERIFIED',
      phone: PHONE,
    });
    await expect(verify(fakeOtpProof(PHONE, 'valid'))).resolves.toMatchObject({
      outcome: 'VERIFIED',
    });
  });

  it('reports a phone mismatch when the proof belongs to another number', async () => {
    await expect(verify(fakeOtpProof(OTHER_PHONE))).resolves.toEqual({ outcome: 'PHONE_MISMATCH' });
  });

  it('reports expired and invalid proofs', async () => {
    await expect(verify(fakeOtpProof(PHONE, 'expired'))).resolves.toEqual({ outcome: 'EXPIRED' });
    await expect(verify(fakeOtpProof(PHONE, 'invalid'))).resolves.toEqual({
      outcome: 'INVALID_PROOF',
    });
  });

  it.each([
    '',
    'garbage',
    'fake-otp',
    'fake-otp:valid',
    'fake-otp:valid:notaphone',
    'fake-otp:unknown:+962791234567',
    'fake-otp:valid:+962791234567:extra',
    'real-otp:valid:+962791234567',
    'eyJhbGciOiJSUzI1NiJ9.e30.signature',
  ])('treats %j as an invalid proof', async (proof) => {
    await expect(verify(proof)).resolves.toEqual({ outcome: 'INVALID_PROOF' });
  });

  it('fails like a provider outage as a 503 external-service error', async () => {
    const failure = await verify(fakeOtpProof(PHONE, 'provider-error')).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ExternalServiceError);
    expect(normalizeError(failure).httpStatus).toBeGreaterThanOrEqual(502);
  });

  it('rejects an expected phone that is not E.164 (caller bug)', async () => {
    await expect(verify(fakeOtpProof(PHONE), '0791234567')).rejects.toBeInstanceOf(RangeError);
  });

  it('accepts every purpose and ignores it for the fake', async () => {
    for (const purpose of OTP_PURPOSES) {
      await expect(
        provider.verify({ proof: fakeOtpProof(PHONE), expectedPhone: PHONE, purpose }),
      ).resolves.toMatchObject({ outcome: 'VERIFIED' });
    }
  });

  it('knows every proof kind', () => {
    expect(FAKE_OTP_PROOF_KINDS).toEqual(['valid', 'expired', 'invalid', 'provider-error']);
  });
});

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

describe('createProviders', () => {
  it('builds the fakes outside production', () => {
    const providers = createProviders({ otp: 'fake', storage: 'fake' }, false);
    expect(providers.otp).toBeInstanceOf(FakeOtpProvider);
    expect(providers.storage).toBeInstanceOf(FakeStorageProvider);
  });

  it('refuses fakes in production even if the config check was bypassed', () => {
    expect(() => createProviders({ otp: 'fake', storage: 'fake' }, true)).toThrow(
      ProviderUnavailableError,
    );
  });

  it.each([
    [{ otp: 'real', storage: 'fake' }, 'otp'],
    [{ otp: 'fake', storage: 'real' }, 'storage'],
  ] as const)('fails loudly for %j: the real integration is not built yet', (modes, name) => {
    const failure = (() => {
      try {
        createProviders(modes, false);
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
