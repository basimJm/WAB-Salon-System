import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import {
  BYTES_PER_MB,
  UPLOAD_POLICIES,
  UPLOAD_PURPOSES,
  UPLOAD_URL_TTL_SEC,
} from '../src/constants/uploads';
import { createUploadsService } from '../src/domain/uploads/uploads.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { FakeStorageProvider } from '../src/providers/storage';
import { MembersRepository } from '../src/repositories/identity.repository';
import { UploadsRepository } from '../src/repositories/uploads.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
let clock = new Date('2026-10-12T10:00:00.000Z');
const uploadsModel = createFakeModel();
const members = createFakeModel();
const storage = new FakeStorageProvider({ now: () => clock });
let counter = 0;
const service = createUploadsService({
  uploads: new UploadsRepository(uploadsModel.model as never),
  storage,
  settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
  now: () => clock,
  newId: () => `id${String((counter += 1))}`,
});
const memberGuard = [
  requireAuth('merchant', SECRET),
  loadMember(new MembersRepository(members.model as never)),
];
const app = createApp({
  logger,
  services: {
    uploads: service,
    adminGuard: requireAuth('admin', SECRET),
    salonProfile: { service: undefined as never, guard: memberGuard },
    installations: {
      service: undefined as never,
      customerOptional: requireAuth('customer', SECRET),
      customerRequired: requireAuth('customer', SECRET),
      merchantRequired: requireAuth('merchant', SECRET),
    },
  },
});

interface Body {
  data: {
    key: string;
    maxBytes: number;
    url: string | null;
    upload: { url: string; method: string; headers: Record<string, string> };
  };
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const bearer = (type: 'CUSTOMER' | 'MEMBER' | 'ADMIN', id: string): Record<string, string> => ({
  Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: id, ttlSec: 600 }).token}`,
});
const salonId = new Types.ObjectId();
const addMember = (role: string, permissions: string[]): string => {
  const _id = new Types.ObjectId();
  members.docs.push({ _id, salonId, role, permissions, active: true });
  return _id.toHexString();
};
const JPEG = { contentType: 'image/jpeg', size: 1_000 };

beforeEach(() => {
  uploadsModel.docs.length = 0;
  members.docs.length = 0;
  clock = new Date('2026-10-12T10:00:00.000Z');
});

describe('upload policies', () => {
  it('cover every purpose, keep license documents (trade + medical) and tattoo designs private, everything else public', () => {
    const PRIVATE = ['LICENSE_DOCUMENT', 'MEDICAL_LICENSE', 'BOOKING_REFERENCE'];
    expect(Object.keys(UPLOAD_POLICIES).sort()).toEqual([...UPLOAD_PURPOSES].sort());
    for (const purpose of UPLOAD_PURPOSES) {
      expect(UPLOAD_POLICIES[purpose].visibility).toBe(
        PRIVATE.includes(purpose) ? 'PRIVATE' : 'PUBLIC',
      );
    }
  });
});

describe('customer uploads', () => {
  it('presigns an avatar with a server-chosen key, records it PENDING and pins type and size', async () => {
    const id = new Types.ObjectId().toHexString();
    const res = await request(app)
      .post('/customer/v1/uploads/presign')
      .set(bearer('CUSTOMER', id))
      .send({ purpose: 'CUSTOMER_AVATAR', ...JPEG });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.key).toBe(`customers/${id}/id1.jpg`);
    expect(bodyOf(res).data.upload.method).toBe('PUT');
    expect(bodyOf(res).data.upload.headers['Content-Type']).toBe('image/jpeg');
    expect(uploadsModel.docs[0]).toMatchObject({
      status: 'PENDING',
      ownerType: 'CUSTOMER',
      ownerId: id,
      maxBytes: 1_000,
      expiresAt: new Date(clock.getTime() + UPLOAD_URL_TTL_SEC * 1_000),
    });
  });

  it('refuses purposes of other apps, wrong types and sizes', async () => {
    const auth = bearer('CUSTOMER', new Types.ObjectId().toHexString());
    const post = async (body: object): Promise<{ status: number; body: unknown }> =>
      await request(app).post('/customer/v1/uploads/presign').set(auth).send(body);
    expect((await post({ purpose: 'SALON_COVER', ...JPEG })).status).toBe(403);
    expect(
      (await post({ purpose: 'CUSTOMER_AVATAR', contentType: 'application/pdf', size: 10 })).status,
    ).toBe(400);
    expect(
      (await post({ purpose: 'CUSTOMER_AVATAR', contentType: 'image/jpeg', size: 0 })).status,
    ).toBe(400);
    expect(
      (await post({ purpose: 'CUSTOMER_AVATAR', contentType: 'image/jpeg', size: 1.5 })).status,
    ).toBe(400);
    const big = await post({
      purpose: 'CUSTOMER_AVATAR',
      contentType: 'image/jpeg',
      size: 10 * BYTES_PER_MB + 1,
    });
    expect(big.status).toBe(400);
    expect(bodyOf(big).error.code).toBe('UPLOAD_TOO_LARGE');
    expect(
      (
        await post({
          purpose: 'CUSTOMER_AVATAR',
          contentType: 'image/jpeg',
          size: 10 * BYTES_PER_MB,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post('/customer/v1/uploads/presign')
          .send({ purpose: 'CUSTOMER_AVATAR', ...JPEG })
      ).status,
    ).toBe(401);
  });

  it('confirms after the file arrived; only its owner can confirm; a repeat is harmless', async () => {
    const id = new Types.ObjectId().toHexString();
    const auth = bearer('CUSTOMER', id);
    const key = bodyOf(
      await request(app)
        .post('/customer/v1/uploads/presign')
        .set(auth)
        .send({ purpose: 'CUSTOMER_AVATAR', ...JPEG }),
    ).data.key;
    const notYet = await request(app).post('/customer/v1/uploads/confirm').set(auth).send({ key });
    expect(notYet.status).toBe(400);
    expect(bodyOf(notYet).error.code).toBe('UPLOAD_INVALID');
    expect(uploadsModel.docs[0]?.['status']).toBe('PENDING');
    storage.simulateUpload(key, { contentType: 'image/jpeg', size: 900 });
    const other = await request(app)
      .post('/customer/v1/uploads/confirm')
      .set(bearer('CUSTOMER', new Types.ObjectId().toHexString()))
      .send({ key });
    expect(other.status).toBe(404);
    const ok = await request(app).post('/customer/v1/uploads/confirm').set(auth).send({ key });
    expect(ok.status).toBe(200);
    expect(bodyOf(ok).data.url).toContain(key);
    expect(uploadsModel.docs[0]?.['status']).toBe('CONFIRMED');
    expect(
      (await request(app).post('/customer/v1/uploads/confirm').set(auth).send({ key })).status,
    ).toBe(200);
  });

  it('rejects and deletes a file of the wrong real type or size', async () => {
    const auth = bearer('CUSTOMER', new Types.ObjectId().toHexString());
    const key = bodyOf(
      await request(app)
        .post('/customer/v1/uploads/presign')
        .set(auth)
        .send({ purpose: 'CUSTOMER_AVATAR', ...JPEG }),
    ).data.key;
    storage.simulateUpload(key, { contentType: 'application/pdf', size: 900 });
    const res = await request(app).post('/customer/v1/uploads/confirm').set(auth).send({ key });
    expect(res.status).toBe(400);
    expect(uploadsModel.docs[0]?.['status']).toBe('REJECTED');
    expect(storage.has(key)).toBe(false);
    expect(
      (await request(app).post('/customer/v1/uploads/confirm').set(auth).send({ key })).status,
    ).toBe(400);
  });

  it('refuses to confirm after the window ended', async () => {
    const auth = bearer('CUSTOMER', new Types.ObjectId().toHexString());
    const key = bodyOf(
      await request(app)
        .post('/customer/v1/uploads/presign')
        .set(auth)
        .send({ purpose: 'CUSTOMER_AVATAR', ...JPEG }),
    ).data.key;
    storage.simulateUpload(key, { contentType: 'image/jpeg', size: 900 });
    clock = new Date(clock.getTime() + (UPLOAD_URL_TTL_SEC + 1) * 1_000);
    expect(
      (await request(app).post('/customer/v1/uploads/confirm').set(auth).send({ key })).status,
    ).toBe(400);
  });

  it('rejects malformed keys', async () => {
    const auth = bearer('CUSTOMER', new Types.ObjectId().toHexString());
    expect(
      (await request(app).post('/customer/v1/uploads/confirm').set(auth).send({ key: '../x' }))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/customer/v1/uploads/confirm')
          .set(auth)
          .send({ key: 'customers/none/x.jpg' })
      ).status,
    ).toBe(404);
  });
});

describe('merchant uploads', () => {
  it('needs the purpose permission; the owner has all; keys are filed under the salon', async () => {
    const owner = addMember('OWNER', []);
    const res = await request(app)
      .post('/merchant/v1/uploads/presign')
      .set(bearer('MEMBER', owner))
      .send({ purpose: 'SALON_COVER', ...JPEG });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.key).toBe(
      `salons/cover/${salonId.toHexString()}/id${String(counter)}.jpg`,
    );
    expect(String(uploadsModel.docs[0]?.['salonId'])).toBe(salonId.toHexString());
    const employee = addMember('EMPLOYEE', ['REVIEWS_VIEW']);
    const denied = await request(app)
      .post('/merchant/v1/uploads/presign')
      .set(bearer('MEMBER', employee))
      .send({ purpose: 'SALON_COVER', ...JPEG });
    expect(denied.status).toBe(403);
    const manager = addMember('MANAGER', ['GALLERY_MANAGE']);
    const video = { purpose: 'GALLERY_VIDEO', contentType: 'video/mp4', size: 50 * BYTES_PER_MB };
    expect(
      (
        await request(app)
          .post('/merchant/v1/uploads/presign')
          .set(bearer('MEMBER', manager))
          .send(video)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post('/merchant/v1/uploads/presign')
          .set(bearer('MEMBER', manager))
          .send({ ...video, size: 50 * BYTES_PER_MB + 1 })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/merchant/v1/uploads/presign')
          .set(bearer('MEMBER', manager))
          .send({ ...video, purpose: 'GALLERY_IMAGE' })
      ).status,
    ).toBe(400);
  });

  it('a member of another salon cannot confirm someone else’s file', async () => {
    const owner = addMember('OWNER', []);
    const key = bodyOf(
      await request(app)
        .post('/merchant/v1/uploads/presign')
        .set(bearer('MEMBER', owner))
        .send({ purpose: 'SALON_COVER', ...JPEG }),
    ).data.key;
    storage.simulateUpload(key, { contentType: 'image/jpeg', size: 10 });
    const other = new Types.ObjectId();
    members.docs.push({
      _id: other,
      salonId: new Types.ObjectId(),
      role: 'OWNER',
      permissions: [],
      active: true,
    });
    const res = await request(app)
      .post('/merchant/v1/uploads/confirm')
      .set(bearer('MEMBER', other.toHexString()))
      .send({ key });
    expect(res.status).toBe(404);
  });

  it('license documents: public presign is private and PDF/image only; members need to be the owner', async () => {
    const res = await request(app)
      .post('/merchant/v1/uploads/license/presign')
      .send({ contentType: 'application/pdf', size: 5_000 });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.key).toBe(`licenses/guest/id${String(counter)}.pdf`);
    expect(uploadsModel.docs[0]).toMatchObject({ ownerType: 'GUEST', purpose: 'LICENSE_DOCUMENT' });
    expect(
      (
        await request(app)
          .post('/merchant/v1/uploads/license/presign')
          .send({ contentType: 'video/mp4', size: 5 })
      ).status,
    ).toBe(400);
    storage.simulateUpload(bodyOf(res).data.key, {
      contentType: 'application/pdf',
      size: 5_000,
    });
    const confirmed = await request(app)
      .post('/merchant/v1/uploads/license/confirm')
      .send({ key: bodyOf(res).data.key });
    expect(confirmed.status).toBe(200);
    expect(bodyOf(confirmed).data.url).toBeNull();
    const manager = addMember('MANAGER', ['SALON_PROFILE_MANAGE']);
    const viaMember = await request(app)
      .post('/merchant/v1/uploads/presign')
      .set(bearer('MEMBER', manager))
      .send({ purpose: 'LICENSE_DOCUMENT', contentType: 'application/pdf', size: 10 });
    expect(viaMember.status).toBe(403);
  });

  it('a clinic applicant uploads its medical license the same way (MEDICAL_LICENSE, private, §5.19)', async () => {
    const res = await request(app)
      .post('/merchant/v1/uploads/license/presign')
      .send({ purpose: 'MEDICAL_LICENSE', contentType: 'application/pdf', size: 5_000 });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.key).toMatch(/^medical-licenses\/guest\//);
    expect(uploadsModel.docs[0]).toMatchObject({ ownerType: 'GUEST', purpose: 'MEDICAL_LICENSE' });
    expect(
      (
        await request(app)
          .post('/merchant/v1/uploads/license/presign')
          .send({ purpose: 'GALLERY_IMAGE', contentType: 'image/jpeg', size: 5 })
      ).status,
    ).toBe(400);
  });
});

describe('admin uploads and the verifier', () => {
  it('admin may presign banner images; other roles may not use admin purposes', async () => {
    const admin = bearer('ADMIN', new Types.ObjectId().toHexString());
    const res = await request(app)
      .post('/admin/v1/uploads/presign')
      .set(admin)
      .send({ purpose: 'BANNER_IMAGE', ...JPEG });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.key).toMatch(/^banners\//);
    expect(
      (
        await request(app)
          .post('/admin/v1/uploads/presign')
          .set(admin)
          .send({ purpose: 'CUSTOMER_AVATAR', ...JPEG })
      ).status,
    ).toBe(403);
    const customer = await request(app)
      .post('/customer/v1/uploads/presign')
      .set(bearer('CUSTOMER', new Types.ObjectId().toHexString()))
      .send({ purpose: 'BANNER_IMAGE', ...JPEG });
    expect(customer.status).toBe(403);
  });

  it('assertConfirmed accepts only confirmed files of the purpose and owner, and lets allowed keys pass', async () => {
    const add = (key: string, over: Record<string, unknown> = {}): void => {
      uploadsModel.docs.push({
        _id: new Types.ObjectId(),
        key,
        purpose: 'SALON_COVER',
        status: 'CONFIRMED',
        ownerType: 'MEMBER',
        ownerId: 'm',
        salonId: salonId.toHexString(),
        ...over,
      });
    };
    add('ok.jpg');
    add('pending.jpg', { status: 'PENDING' });
    add('other-purpose.jpg', { purpose: 'GALLERY_IMAGE' });
    add('other-salon.jpg', { salonId: new Types.ObjectId().toHexString() });
    const check = async (keys: string[], allow: string[] = []): Promise<unknown> =>
      await service
        .assertConfirmed({
          keys,
          purpose: 'SALON_COVER',
          field: 'body.coverKey',
          allow,
          accept: (u) => u.salonId === salonId.toHexString(),
        })
        .then(
          () => 'ok',
          (e: unknown) => (e as { code: string }).code,
        );
    expect(await check(['ok.jpg'])).toBe('ok');
    expect(await check(['pending.jpg'])).toBe('UPLOAD_INVALID');
    expect(await check(['other-purpose.jpg'])).toBe('UPLOAD_INVALID');
    expect(await check(['other-salon.jpg'])).toBe('UPLOAD_INVALID');
    expect(await check(['never-issued.jpg'])).toBe('UPLOAD_INVALID');
    expect(await check(['never-issued.jpg'], ['never-issued.jpg'])).toBe('ok');
    expect(await check([])).toBe('ok');
  });

  it('answers 503 when unconfigured', async () => {
    expect(
      (await request(createApp({ logger })).post('/admin/v1/uploads/presign').send({})).status,
    ).toBe(503);
  });
});
