import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createCatalogRequestsService } from '../src/domain/catalog/catalogRequests.service';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createSalonServicesService } from '../src/domain/salonServices/salonServices.service';
import type { UploadVerifier } from '../src/domain/uploads/uploads.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { FakeStorageProvider } from '../src/providers/storage';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { CatalogRequestsRepository } from '../src/repositories/catalogRequests.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { ValidationError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const womenSalon = new Types.ObjectId();
const menSalon = new Types.ObjectId();
const salonsM = createFakeModel();
const catalogM = createFakeModel();
const servicesM = createFakeModel();
const requestsM = createFakeModel();
const membersM = createFakeModel();
const recomputes: string[] = [];
const checks: Parameters<UploadVerifier['assertConfirmed']>[0][] = [];
const verifier: { reject: string[] } & UploadVerifier = {
  reject: [],
  assertConfirmed(input) {
    checks.push(input);
    return input.keys.some((k) => this.reject.includes(k))
      ? Promise.reject(new ValidationError({ code: 'UPLOAD_INVALID' }))
      : Promise.resolve();
  },
};
const audits: Record<string, unknown>[] = [];
const decided: Record<string, unknown>[] = [];
const salonsRepo = new SalonsRepository(salonsM.model as never);
const catalogRepo = new CatalogServicesRepository(catalogM.model as never);
const storage = new FakeStorageProvider();
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    salonProfile: {
      service: undefined as never,
      guard: [
        requireAuth('merchant', SECRET),
        loadMember(new MembersRepository(membersM.model as never)),
      ],
    },
    salonServices: createSalonServicesService({
      salons: salonsRepo,
      catalog: catalogRepo,
      services: new SalonServicesRepository(servicesM.model as never),
      storage,
      uploads: verifier,
      state: {
        recompute: (id) => {
          recomputes.push(id);
          return Promise.resolve({ salonId: id, state: 'LIVE', missing: [], isComplete: true });
        },
      },
    }),
    catalogRequests: createCatalogRequestsService({
      requests: new CatalogRequestsRepository(requestsM.model as never),
      salons: salonsRepo,
      catalog: catalogRepo,
      uploads: verifier,
      audit: createAuditWriter({
        append: (data) => {
          audits.push(data);
          return Promise.resolve({ id: 'a', ...data } as never);
        },
      }),
      notifier: {
        decided: (r) => {
          decided.push(r);
          return Promise.resolve();
        },
      },
      logger,
    }),
  },
});

interface Body {
  data: Record<string, unknown> & Record<string, unknown>[];
  meta?: { total: number };
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const member = (
  role: string,
  permissions: string[],
  salonId = womenSalon,
): Record<string, string> => {
  const _id = new Types.ObjectId();
  membersM.docs.push({ _id, salonId, role, permissions, active: true });
  return {
    Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: _id.toHexString(), ttlSec: 600 }).token}`,
  };
};
const admin = (): Record<string, string> => ({
  Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: new Types.ObjectId().toHexString(), ttlSec: 600 }).token}`,
});
const catalogEntry = (gender: string, over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  catalogM.docs.push({
    _id,
    name: { ar: 'قص', en: 'Cut' },
    description: { ar: 'و', en: 'd' },
    imageKey: 'catalog/cut.jpg',
    businessType: 'SALON',
    audience: gender,
    active: true,
    sortOrder: 0,
    ...over,
  });
  return _id.toHexString();
};

beforeEach(() => {
  for (const f of [salonsM, catalogM, servicesM, requestsM, membersM]) f.docs.length = 0;
  salonsM.docs.push(
    { _id: womenSalon, name: 'Glow', businessType: 'SALON', audience: 'FEMALE' },
    { _id: menSalon, name: 'Barber', businessType: 'SALON', audience: 'MALE' },
  );
  recomputes.length = 0;
  checks.length = 0;
  audits.length = 0;
  decided.length = 0;
  verifier.reject = [];
});

describe('salon services', () => {
  const add = async (
    headers: Record<string, string>,
    body: object,
  ): Promise<{ status: number; body: unknown }> =>
    await request(app).post('/merchant/v1/salon/services').set(headers).send(body);
  const BASE = { price: '12.500', durationMinutes: 45 };

  it('needs SERVICES_MANAGE', async () => {
    expect((await request(app).get('/merchant/v1/salon/services')).status).toBe(401);
    expect(
      (
        await request(app)
          .get('/merchant/v1/salon/services')
          .set(member('EMPLOYEE', ['REVIEWS_VIEW']))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get('/merchant/v1/salon/services')
          .set(member('MANAGER', ['SERVICES_MANAGE']))
      ).status,
    ).toBe(200);
  });

  it('adds a catalog service with price in fils, completeness recomputed, localized name', async () => {
    const owner = member('OWNER', []);
    const id = catalogEntry('FEMALE');
    const res = await add(owner, { catalogServiceId: id, ...BASE, extraDescription: 'with wash' });
    expect(res.status).toBe(201);
    expect(servicesM.docs[0]).toMatchObject({
      price: 12_500,
      durationMinutes: 45,
      brideOnly: false,
      active: true,
      extraDescription: 'with wash',
    });
    expect(bodyOf(res).data).toMatchObject({
      price: '12.500',
      name: 'قص',
      active: true,
      brideOnly: false,
    });
    expect(recomputes).toEqual([womenSalon.toHexString()]);
  });

  it.each([
    ['a price of zero', { price: '0.000' }],
    ['a price with 4 decimals', { price: '1.2345' }],
    ['a number price', { price: 12.5 }],
    ['a duration not a multiple of 5', { durationMinutes: 42 }],
    ['a duration below 5', { durationMinutes: 0 }],
    ['a duration above a day', { durationMinutes: 1445 }],
    ['too long a description', { extraDescription: 'x'.repeat(501) }],
    ['duplicate media keys', { mediaKeys: ['services/a.jpg', 'services/a.jpg'] }],
    [
      '11 media items',
      { mediaKeys: Array.from({ length: 11 }, (_, i) => `services/${String(i)}.jpg`) },
    ],
  ])('rejects %s', async (_n, over) => {
    const owner = member('OWNER', []);
    const res = await add(owner, { catalogServiceId: catalogEntry('FEMALE'), ...BASE, ...over });
    expect(res.status).toBe(400);
    expect(servicesM.docs).toHaveLength(0);
  });

  it('only services of the salon’s type and audience, active, existing, once per salon', async () => {
    const owner = member('OWNER', []);
    const men = await add(owner, { catalogServiceId: catalogEntry('MALE'), ...BASE });
    expect(men.status).toBe(400);
    expect(bodyOf(men).error.code).toBe('BUSINESS_TYPE_MISMATCH');
    const clinic = await add(owner, {
      catalogServiceId: catalogEntry('BOTH', { businessType: 'CLINIC' }),
      ...BASE,
    });
    expect(clinic.status).toBe(400);
    expect(bodyOf(clinic).error.code).toBe('BUSINESS_TYPE_MISMATCH');
    // A BOTH catalog entry of the same type fits a women's salon.
    expect((await add(owner, { catalogServiceId: catalogEntry('BOTH'), ...BASE })).status).toBe(
      201,
    );
    servicesM.docs.length = 0;
    expect(
      (await add(owner, { catalogServiceId: catalogEntry('FEMALE', { active: false }), ...BASE }))
        .status,
    ).toBe(400);
    expect(
      (await add(owner, { catalogServiceId: new Types.ObjectId().toHexString(), ...BASE })).status,
    ).toBe(400);
    const id = catalogEntry('FEMALE');
    expect((await add(owner, { catalogServiceId: id, ...BASE })).status).toBe(201);
    expect((await add(owner, { catalogServiceId: id, ...BASE })).status).toBe(409);
    expect(servicesM.docs).toHaveLength(1);
  });

  it('bride-only is allowed in women’s salons only', async () => {
    const women = await add(member('OWNER', []), {
      catalogServiceId: catalogEntry('FEMALE'),
      ...BASE,
      brideOnly: true,
    });
    expect(women.status).toBe(201);
    expect(bodyOf(women).data['brideOnly']).toBe(true);
    const men = await add(member('OWNER', [], menSalon), {
      catalogServiceId: catalogEntry('MALE'),
      ...BASE,
      brideOnly: true,
    });
    expect(men.status).toBe(400);
    expect(bodyOf(men).error.code).toBe('BRIDE_NOT_ALLOWED');
    expect(bodyOf(men).error.details.map((d) => d.field)).toContain('body.brideOnly');
  });

  it('media must be confirmed SERVICE_MEDIA uploads of this salon', async () => {
    const owner = member('OWNER', []);
    const id = catalogEntry('FEMALE');
    verifier.reject = ['services/bad.jpg'];
    expect(
      (await add(owner, { catalogServiceId: id, ...BASE, mediaKeys: ['services/bad.jpg'] })).status,
    ).toBe(400);
    expect(servicesM.docs).toHaveLength(0);
    const ok = await add(owner, {
      catalogServiceId: id,
      ...BASE,
      mediaKeys: ['services/good.jpg'],
    });
    expect(ok.status).toBe(201);
    expect(checks.at(-1)).toMatchObject({ purpose: 'SERVICE_MEDIA', keys: ['services/good.jpg'] });
    expect(checks.at(-1)?.accept?.({ salonId: womenSalon.toHexString() } as never)).toBe(true);
    expect(checks.at(-1)?.accept?.({ salonId: 'x' } as never)).toBe(false);
    expect(String((bodyOf(ok).data['mediaUrls'] as string[])[0])).toContain('services/good.jpg');
  });

  it('updates fields, clears the description with null, switches off with active=false', async () => {
    const owner = member('OWNER', []);
    const created = await add(owner, {
      catalogServiceId: catalogEntry('FEMALE'),
      ...BASE,
      extraDescription: 'old',
    });
    const id = String(bodyOf(created).data['id']);
    recomputes.length = 0;
    const res = await request(app)
      .patch(`/merchant/v1/salon/services/${id}`)
      .set(owner)
      .send({ price: '15.000', durationMinutes: 60, extraDescription: null, active: false });
    expect(res.status).toBe(200);
    expect(servicesM.docs[0]).toMatchObject({ price: 15_000, durationMinutes: 60, active: false });
    expect(servicesM.docs[0]?.['extraDescription']).toBeUndefined();
    expect(recomputes).toHaveLength(1);
    expect(
      (await request(app).patch(`/merchant/v1/salon/services/${id}`).set(owner).send({})).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/merchant/v1/salon/services/${id}`)
          .set(owner)
          .send({ durationMinutes: 7 })
      ).status,
    ).toBe(400);
  });

  it('a salon can neither see nor change another salon’s services; lists are paginated', async () => {
    const owner = member('OWNER', []);
    const other = new Types.ObjectId();
    servicesM.docs.push({
      _id: other,
      salonId: menSalon,
      catalogServiceId: new Types.ObjectId(),
      price: 1000,
      durationMinutes: 30,
      brideOnly: false,
      mediaKeys: [],
      active: true,
    });
    expect(
      (
        await request(app)
          .patch(`/merchant/v1/salon/services/${other.toHexString()}`)
          .set(owner)
          .send({ active: false })
      ).status,
    ).toBe(404);
    for (let i = 0; i < 3; i += 1) {
      await add(owner, {
        catalogServiceId: catalogEntry('FEMALE', {
          name: { ar: `س${String(i)}`, en: `S${String(i)}` },
        }),
        ...BASE,
      });
    }
    const list = await request(app).get('/merchant/v1/salon/services?pageSize=2').set(owner);
    expect(bodyOf(list).data).toHaveLength(2);
    expect(bodyOf(list).meta?.total).toBe(3);
  });
});

describe('catalog requests', () => {
  it('a salon sends a request (optional confirmed picture) and sees its list with status', async () => {
    const owner = member('OWNER', []);
    const res = await request(app)
      .post('/merchant/v1/catalog/requests')
      .set(owner)
      .send({ name: 'Keratin', description: 'Smoothing treatment', imageKey: 'catalog/k.jpg' });
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({
      status: 'PENDING',
      name: 'Keratin',
      imageKey: 'catalog/k.jpg',
    });
    expect(checks.at(-1)).toMatchObject({ purpose: 'CATALOG_IMAGE' });
    expect(requestsM.docs[0]?.['status']).toBe('PENDING');
    const list = await request(app).get('/merchant/v1/catalog/requests').set(owner);
    expect(bodyOf(list).data).toHaveLength(1);
    expect(
      (await request(app).get('/merchant/v1/catalog/requests').set(member('EMPLOYEE', []))).status,
    ).toBe(403);
  });

  it.each([
    ['blank name', { name: ' ', description: 'd' }],
    ['no description', { name: 'x' }],
    ['long name', { name: 'x'.repeat(101), description: 'd' }],
  ])('rejects %s', async (_n, body) => {
    expect(
      (await request(app).post('/merchant/v1/catalog/requests').set(member('OWNER', [])).send(body))
        .status,
    ).toBe(400);
    expect(requestsM.docs).toHaveLength(0);
  });

  const pending = (salonId = womenSalon, over: Record<string, unknown> = {}): string => {
    const _id = new Types.ObjectId();
    requestsM.docs.push({
      _id,
      salonId,
      requestedByMemberId: new Types.ObjectId(),
      name: 'Keratin',
      description: 'desc',
      status: 'PENDING',
      createdAt: new Date('2026-10-01'),
      ...over,
    });
    return _id.toHexString();
  };
  const APPROVE = {
    name: { ar: 'كيراتين', en: 'Keratin' },
    description: { ar: 'وصف', en: 'Smoothing' },
    reason: 'popular service',
  };

  it('admin sees the queue oldest first with the salon name', async () => {
    pending(womenSalon, { createdAt: new Date('2026-10-05'), name: 'Later' });
    pending(menSalon, { createdAt: new Date('2026-10-01'), name: 'Earlier' });
    pending(womenSalon, { status: 'REJECTED' });
    const res = await request(app).get('/admin/v1/catalog/requests').set(admin());
    expect(bodyOf(res).data.map((r) => r['name'])).toEqual(['Earlier', 'Later']);
    expect(bodyOf(res).data[0]?.['salonName']).toBe('Barber');
    expect((await request(app).get('/admin/v1/catalog/requests')).status).toBe(401);
  });

  it('approve creates a catalog service of the salon’s type and audience, marks the request, audits and tells the salon', async () => {
    const id = pending(womenSalon, { imageKey: 'catalog/k.jpg' });
    const res = await request(app)
      .post(`/admin/v1/catalog/requests/${id}/approve`)
      .set(admin())
      .send(APPROVE);
    expect(res.status).toBe(200);
    expect(catalogM.docs[0]).toMatchObject({
      businessType: 'SALON',
      audience: 'FEMALE',
      imageKey: 'catalog/k.jpg',
      active: true,
      name: { en: 'Keratin' },
    });
    expect(requestsM.docs[0]).toMatchObject({ status: 'APPROVED', adminNote: 'popular service' });
    expect(String(requestsM.docs[0]?.['catalogServiceId'])).toBe(String(catalogM.docs[0]?.['_id']));
    expect(audits[0]).toMatchObject({
      action: 'CATALOG_REQUEST_APPROVE',
      reason: 'popular service',
    });
    expect(decided).toEqual([
      {
        salonId: womenSalon.toHexString(),
        requestId: id,
        decision: 'approved',
        note: 'popular service',
      },
    ]);
    expect(bodyOf(res).data['status']).toBe('APPROVED');
  });

  it('approve can map the request to an existing catalog service that fits the salon (SRV-125, §5.19)', async () => {
    const existing = new Types.ObjectId();
    const menOnly = new Types.ObjectId();
    catalogM.docs.push(
      {
        _id: existing,
        businessType: 'SALON',
        audience: 'FEMALE',
        active: true,
        name: { ar: 'ك', en: 'Keratin care' },
      },
      {
        _id: menOnly,
        businessType: 'SALON',
        audience: 'MALE',
        active: true,
        name: { ar: 'ح', en: 'Shave' },
      },
    );
    const before = catalogM.docs.length;
    const id = pending(womenSalon);
    const wrongGender = await request(app)
      .post(`/admin/v1/catalog/requests/${id}/approve`)
      .set(admin())
      .send({ catalogServiceId: menOnly.toHexString(), reason: 'same service' });
    expect(wrongGender.status).toBe(422);
    const res = await request(app)
      .post(`/admin/v1/catalog/requests/${id}/approve`)
      .set(admin())
      .send({ catalogServiceId: existing.toHexString(), reason: 'same service' });
    expect(res.status).toBe(200);
    expect(catalogM.docs).toHaveLength(before);
    const stored = requestsM.docs.find((r) => String(r['_id']) === id);
    expect(String(stored?.['catalogServiceId'])).toBe(existing.toHexString());
    expect(audits.at(-1)).toMatchObject({ action: 'CATALOG_REQUEST_APPROVE' });
    // A body mixing both ways is refused.
    const mixed = await request(app)
      .post(`/admin/v1/catalog/requests/${pending(womenSalon)}/approve`)
      .set(admin())
      .send({ ...APPROVE, catalogServiceId: existing.toHexString() });
    expect(mixed.status).toBe(400);
  });

  it('approve needs a picture when the request has none; the admin one must be a confirmed admin upload', async () => {
    const id = pending();
    const missing = await request(app)
      .post(`/admin/v1/catalog/requests/${id}/approve`)
      .set(admin())
      .send(APPROVE);
    expect(missing.status).toBe(400);
    expect(requestsM.docs[0]?.['status']).toBe('PENDING');
    expect(catalogM.docs).toHaveLength(0);
    const ok = await request(app)
      .post(`/admin/v1/catalog/requests/${id}/approve`)
      .set(admin())
      .send({ ...APPROVE, imageKey: 'catalog/admin.jpg' });
    expect(ok.status).toBe(200);
    expect(checks.at(-1)?.accept?.({ ownerType: 'ADMIN' } as never)).toBe(true);
    expect(checks.at(-1)?.accept?.({ ownerType: 'MEMBER' } as never)).toBe(false);
  });

  it('reject keeps the note for the salon; a decided request cannot be decided again', async () => {
    const id = pending();
    const res = await request(app)
      .post(`/admin/v1/catalog/requests/${id}/reject`)
      .set(admin())
      .send({ reason: 'already exists' });
    expect(res.status).toBe(200);
    expect(requestsM.docs[0]).toMatchObject({ status: 'REJECTED', adminNote: 'already exists' });
    expect(catalogM.docs).toHaveLength(0);
    expect(audits[0]).toMatchObject({ action: 'CATALOG_REQUEST_REJECT' });
    expect(decided[0]).toMatchObject({ decision: 'rejected' });
    const again = await request(app)
      .post(`/admin/v1/catalog/requests/${id}/approve`)
      .set(admin())
      .send({ ...APPROVE, imageKey: 'catalog/x.jpg' });
    expect(again.status).toBe(422);
    expect(bodyOf(again).error.code).toBe('ALREADY_HANDLED');
    expect(
      (
        await request(app)
          .post(`/admin/v1/catalog/requests/${new Types.ObjectId().toHexString()}/reject`)
          .set(admin())
          .send({ reason: 'x' })
      ).status,
    ).toBe(404);
    expect(
      (await request(app).post(`/admin/v1/catalog/requests/${id}/reject`).set(admin()).send({}))
        .status,
    ).toBe(400);
  });

  it('answers 503 when unconfigured', async () => {
    expect((await request(createApp({ logger })).get('/merchant/v1/catalog/requests')).status).toBe(
      503,
    );
    expect((await request(createApp({ logger })).get('/admin/v1/catalog/requests')).status).toBe(
      503,
    );
  });
});
