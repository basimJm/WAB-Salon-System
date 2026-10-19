import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { createAdminSalonEditService } from '../src/domain/adminSalonEdit/adminSalonEdit.service';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createGalleryService } from '../src/domain/gallery/gallery.service';
import { createSalonProfileService } from '../src/domain/salons/salonProfile.service';
import { createSalonStateService } from '../src/domain/salons/salonState.service';
import type { UploadVerifier } from '../src/domain/uploads/uploads.service';
import { requireAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { AuditLogsRepository } from '../src/repositories/auditLogs.repository';
import { GalleryRepository } from '../src/repositories/gallery.repository';
import { AreasRepository, CitiesRepository } from '../src/repositories/locations.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { ValidationError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const REASON = 'Owner asked by phone';
const cityId = new Types.ObjectId();
const areaId = new Types.ObjectId();
const otherCity = new Types.ObjectId();
const salonId = new Types.ObjectId();
const adminId = new Types.ObjectId().toHexString();

const m = {
  salons: createFakeModel(),
  gallery: createFakeModel(),
  audit: createFakeModel(),
  cities: createFakeModel([
    { _id: cityId, active: true },
    { _id: otherCity, active: true },
  ]),
  areas: createFakeModel([{ _id: areaId, cityId, active: true }]),
};
const notices: Record<string, unknown>[] = [];
const notifier = {
  changed: jest.fn((change: Record<string, unknown>) => {
    notices.push(change);
    return Promise.resolve();
  }),
};
/** Mirrors the real verifier: confirmed, right purpose, and the caller's `accept` rule. */
const uploads = new Map<string, { purpose: string; ownerType: string; salonId?: Types.ObjectId }>();
const verifier: UploadVerifier = {
  assertConfirmed: ({ keys, purpose, field, accept = () => true }) => {
    const bad = keys.filter((key) => {
      const upload = uploads.get(key);
      return (
        upload === undefined ||
        upload.purpose !== purpose ||
        !accept({ ...upload, key, status: 'CONFIRMED' } as never)
      );
    });
    return bad.length === 0
      ? Promise.resolve()
      : Promise.reject(
          new ValidationError({
            code: ERROR_CODES.UPLOAD_INVALID,
            details: [
              { field, code: ERROR_CODES.UPLOAD_INVALID, messageKey: 'errors.UPLOAD_INVALID' },
            ],
          }),
        );
  },
};
const salonRepo = new SalonsRepository(m.salons.model as never);
const storage = new FakeStorageProvider();
const state = createSalonStateService({
  salons: salonRepo,
  facts: {
    activeServiceCount: () => Promise.resolve(1),
    qualifiedStaffCount: () => Promise.resolve(1),
  },
  audit: createAuditWriter({ append: () => Promise.reject(new Error('unused')) }),
  notifier: { changed: () => Promise.resolve() },
  logger,
});
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminSalonEdit: createAdminSalonEditService({
      profile: createSalonProfileService({
        salons: salonRepo,
        cities: new CitiesRepository(m.cities.model as never),
        areas: new AreasRepository(m.areas.model as never),
        storage,
        state,
        uploads: verifier,
      }),
      gallery: createGalleryService({
        gallery: new GalleryRepository(m.gallery.model as never),
        storage,
        uploads: verifier,
        settings: { get: () => Promise.resolve(60 as never) },
      }),
      audit: createAuditWriter(new AuditLogsRepository(m.audit.model as never)),
      notifier,
      logger,
    }),
  },
});

interface Body {
  data: Record<string, unknown> & unknown[];
  error?: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const bearer = (type: 'ADMIN' | 'MEMBER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: adminId, ttlSec: 600 }).token}`;
const salon = `/admin/v1/salons/${salonId.toHexString()}`;
const call = (
  method: 'get' | 'post' | 'put' | 'patch',
  path: string,
  body?: object,
): Promise<{ status: number; body: unknown }> => {
  const req = request(app)[method](`${salon}${path}`).set('Authorization', bearer());
  return body === undefined ? req : req.send(body);
};
const addUpload = (key: string, purpose: string, ownerType = 'ADMIN'): void => {
  uploads.set(key, { purpose, ownerType });
};

beforeEach(() => {
  for (const model of [m.salons, m.gallery, m.audit]) model.docs.length = 0;
  m.salons.docs.push({
    _id: salonId,
    name: 'Glow',
    gender: 'FEMALE',
    state: 'LIVE',
    weeklySchedule: [],
    completeness: { missing: [], isComplete: true },
    rating: { avg: 0, count: 0 },
  });
  uploads.clear();
  notices.length = 0;
  notifier.changed.mockClear();
});

describe('admin salon edit: profile', () => {
  it('needs an admin token', async () => {
    expect((await request(app).get(`${salon}/profile`)).status).toBe(401);
    expect(
      (await request(app).get(`${salon}/profile`).set('Authorization', bearer('MEMBER'))).status,
    ).toBe(403);
  });

  it('reads the profile and answers 404 for an unknown salon', async () => {
    const res = await call('get', '/profile');
    expect(res.status).toBe(200);
    expect(bodyOf(res).data['name']).toBe('Glow');
    const missing = await request(app)
      .get(`/admin/v1/salons/${new Types.ObjectId().toHexString()}/profile`)
      .set('Authorization', bearer());
    expect(missing.status).toBe(404);
  });

  it('edits the profile with a reason, audits only the changed fields and tells the owner', async () => {
    const res = await call('patch', '/profile', {
      name: 'Glow Studio',
      phone: '+962791234567',
      reason: REASON,
    });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data['name']).toBe('Glow Studio');
    expect(m.salons.docs[0]?.['name']).toBe('Glow Studio');
    expect(m.audit.docs).toHaveLength(1);
    expect(m.audit.docs[0]).toMatchObject({
      action: 'SALON_PROFILE_EDIT',
      entityType: 'salon',
      entityId: salonId.toHexString(),
      reason: REASON,
      before: { name: 'Glow', phone: null },
      after: { name: 'Glow Studio', phone: '+962791234567' },
    });
    expect(notices).toEqual([
      {
        salonId: salonId.toHexString(),
        event: 'salon.edited_by_admin',
        reason: REASON,
        area: 'profile',
      },
    ]);
  });

  it('refuses a write without a reason, an empty patch and bad values', async () => {
    expect((await call('patch', '/profile', { name: 'No reason' })).status).toBe(400);
    expect((await call('patch', '/profile', { reason: REASON })).status).toBe(400);
    expect((await call('patch', '/profile', { name: 'X', reason: '   ' })).status).toBe(400);
    expect((await call('patch', '/profile', { phone: '0791', reason: REASON })).status).toBe(400);
    expect(m.audit.docs).toHaveLength(0);
    expect(notices).toHaveLength(0);
  });

  it('an area from another city is refused and nothing is audited or announced', async () => {
    const res = await call('patch', '/profile', {
      cityId: otherCity.toHexString(),
      areaId: areaId.toHexString(),
      reason: REASON,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(m.audit.docs).toHaveLength(0);
    expect(notices).toHaveLength(0);
  });

  it('accepts images the admin uploaded for that purpose and refuses anyone else’s', async () => {
    addUpload('salons/cover/admin.jpg', 'SALON_COVER');
    addUpload('salons/cover/customer.jpg', 'SALON_COVER', 'CUSTOMER');
    addUpload('salons/profile/admin.jpg', 'SALON_PROFILE');
    const ok = await call('patch', '/profile', {
      coverKey: 'salons/cover/admin.jpg',
      reason: REASON,
    });
    expect(ok.status).toBe(200);
    const wrongOwner = await call('patch', '/profile', {
      coverKey: 'salons/cover/customer.jpg',
      reason: REASON,
    });
    expect(wrongOwner.status).toBe(400);
    expect(bodyOf(wrongOwner).error?.code).toBe(ERROR_CODES.UPLOAD_INVALID);
    const wrongPurpose = await call('patch', '/profile', {
      coverKey: 'salons/profile/admin.jpg',
      reason: REASON,
    });
    expect(wrongPurpose.status).toBe(400);
    expect(m.audit.docs).toHaveLength(1);
  });

  it('a failed owner notice never fails an edit that was stored', async () => {
    notifier.changed.mockRejectedValueOnce(new Error('push down'));
    const res = await call('patch', '/profile', { name: 'Still saved', reason: REASON });
    expect(res.status).toBe(200);
    expect(m.audit.docs).toHaveLength(1);
  });
});

describe('admin salon edit: gallery', () => {
  const add = async (key: string): Promise<string> => {
    addUpload(key, 'GALLERY_IMAGE');
    const res = await call('post', '/gallery', { type: 'IMAGE', key, reason: REASON });
    expect(res.status).toBe(201);
    return String(bodyOf(res).data['id']);
  };

  it('adds an admin-uploaded image, audits and tells the owner', async () => {
    const id = await add('gallery/a.jpg');
    expect(m.audit.docs[0]).toMatchObject({
      action: 'SALON_GALLERY_ADD',
      reason: REASON,
      after: { id, type: 'IMAGE' },
    });
    expect(notices[0]).toMatchObject({ event: 'salon.edited_by_admin', area: 'gallery' });
    const list = bodyOf(await call('get', '/gallery'));
    expect(list.data).toHaveLength(1);
  });

  it('refuses an unknown key, another purpose, and a missing reason', async () => {
    const unknown = await call('post', '/gallery', {
      type: 'IMAGE',
      key: 'gallery/none.jpg',
      reason: REASON,
    });
    expect(unknown.status).toBe(400);
    addUpload('gallery/video.mp4', 'GALLERY_VIDEO');
    const wrongPurpose = await call('post', '/gallery', {
      type: 'IMAGE',
      key: 'gallery/video.mp4',
      reason: REASON,
    });
    expect(wrongPurpose.status).toBe(400);
    addUpload('gallery/b.jpg', 'GALLERY_IMAGE');
    expect((await call('post', '/gallery', { type: 'IMAGE', key: 'gallery/b.jpg' })).status).toBe(
      400,
    );
    expect(m.audit.docs).toHaveLength(0);
  });

  it('reorders: every id exactly once, audited with before and after', async () => {
    const first = await add('gallery/1.jpg');
    const second = await add('gallery/2.jpg');
    m.audit.docs.length = 0;
    const res = await call('put', '/gallery/order', { ids: [second, first], reason: REASON });
    expect(res.status).toBe(200);
    expect((bodyOf(res).data as unknown as { id: string }[]).map((i) => i.id)).toEqual([
      second,
      first,
    ]);
    expect(m.audit.docs[0]).toMatchObject({ action: 'SALON_GALLERY_REORDER' });
    const partial = await call('put', '/gallery/order', { ids: [second], reason: REASON });
    expect(partial.status).toBeGreaterThanOrEqual(400);
  });

  it('removes an item with a reason and answers 404 for an item that is not there', async () => {
    const id = await add('gallery/rm.jpg');
    m.audit.docs.length = 0;
    const res = await call('post', `/gallery/${id}/remove`, { reason: REASON });
    expect(res.status).toBe(200);
    expect(m.audit.docs[0]).toMatchObject({ action: 'SALON_GALLERY_REMOVE', before: { id } });
    expect((bodyOf(await call('get', '/gallery')).data as unknown[]).length).toBe(0);
    const again = await call('post', `/gallery/${id}/remove`, { reason: REASON });
    expect(again.status).toBe(404);
    expect((await call('post', `/gallery/${id}/remove`, {})).status).toBe(400);
  });
});
