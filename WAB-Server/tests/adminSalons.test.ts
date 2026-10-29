import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAdminSalonsService } from '../src/domain/salons/adminSalons.service';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { requireAuth } from '../src/middlewares/auth';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { SubscriptionsRepository } from '../src/repositories/subscriptions.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const adminId = new Types.ObjectId().toHexString();
const salonsM = createFakeModel();
const membersM = createFakeModel();
const subsM = createFakeModel();
const servicesM = createFakeModel();
const catalogM = createFakeModel();
const audits: Record<string, unknown>[] = [];
const events: Record<string, unknown>[] = [];
const recomputes: string[] = [];
const notifier = { fail: false };
const upcoming = { list: [] as { bookingId: string; startsAt: Date; status: string }[] };
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminSalons: createAdminSalonsService({
      salons: new SalonsRepository(salonsM.model as never),
      members: new MembersRepository(membersM.model as never),
      subscriptions: new SubscriptionsRepository(subsM.model as never),
      salonServices: new SalonServicesRepository(servicesM.model as never),
      catalog: new CatalogServicesRepository(catalogM.model as never),
      state: {
        recompute: (id) => {
          recomputes.push(id);
          return Promise.resolve({ salonId: id, state: 'LIVE', missing: [], isComplete: true });
        },
      },
      audit: createAuditWriter({
        append: (data) => {
          audits.push(data);
          return Promise.resolve({ id: 'a', ...data } as never);
        },
      }),
      notifier: {
        changed: (change) => {
          events.push(change);
          return notifier.fail ? Promise.reject(new Error('down')) : Promise.resolve();
        },
      },
      logger,
      bookings: { check: () => Promise.resolve(upcoming.list) },
    }),
  },
});

interface Body {
  data: Record<string, unknown> & Record<string, unknown>[];
  meta?: { total: number };
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const admin = (): Record<string, string> => ({
  Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: adminId, ttlSec: 600 }).token}`,
});
const city = new Types.ObjectId();
const addSalon = (name: string, over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  salonsM.docs.push({
    _id,
    name,
    businessType: 'SALON',
    audience: 'FEMALE',
    state: 'LIVE',
    cityId: city,
    rating: { avg: 4.5, count: 3 },
    completeness: { missing: [], isComplete: true },
    createdAt: new Date(`2026-10-0${String(salonsM.docs.length + 1)}`),
    ...over,
  });
  return _id.toHexString();
};

beforeEach(() => {
  for (const f of [salonsM, membersM, subsM, servicesM, catalogM]) f.docs.length = 0;
  audits.length = 0;
  events.length = 0;
  recomputes.length = 0;
  notifier.fail = false;
  upcoming.list = [];
});

describe('GET /admin/v1/salons', () => {
  it('needs an admin token', async () => {
    expect((await request(app).get('/admin/v1/salons')).status).toBe(401);
  });

  it('lists newest first with subscription status and filters by state, business type, audience, city and name', async () => {
    const a = addSalon('Glow Beauty');
    addSalon('Barber Shop', { audience: 'MALE', state: 'OFFLINE', cityId: new Types.ObjectId() });
    addSalon('Glow Nails', { state: 'APPROVED_INCOMPLETE' });
    subsM.docs.push({
      _id: new Types.ObjectId(),
      salonId: new Types.ObjectId(a),
      status: 'TRIAL',
      trialEndsAt: new Date(),
    });
    const all = await request(app).get('/admin/v1/salons').set(admin());
    expect(bodyOf(all).data.map((s) => s['name'])).toEqual([
      'Glow Nails',
      'Barber Shop',
      'Glow Beauty',
    ]);
    expect(bodyOf(all).data[2]?.['subscriptionStatus']).toBe('TRIAL');
    expect(bodyOf(all).data[0]?.['subscriptionStatus']).toBeNull();
    expect(bodyOf(all).meta?.total).toBe(3);
    const names = async (query: string): Promise<unknown[]> =>
      bodyOf(await request(app).get(`/admin/v1/salons?${query}`).set(admin())).data.map(
        (s) => s['name'],
      );
    expect(await names('state=OFFLINE')).toEqual(['Barber Shop']);
    expect(await names('audience=FEMALE')).toEqual(['Glow Nails', 'Glow Beauty']);
    expect(await names('businessType=SALON')).toHaveLength(3);
    expect(await names('businessType=CLINIC')).toEqual([]);
    expect(await names(`cityId=${city.toHexString()}`)).toEqual(['Glow Nails', 'Glow Beauty']);
    expect(await names('q=glow')).toEqual(['Glow Nails', 'Glow Beauty']);
    expect(await names('q=a.b')).toEqual([]);
    expect(await names('pageSize=1&page=2')).toEqual(['Barber Shop']);
    expect((await request(app).get('/admin/v1/salons?state=NOPE').set(admin())).status).toBe(400);
    expect((await request(app).get('/admin/v1/salons?cityId=x').set(admin())).status).toBe(400);
  });
});

describe('GET /admin/v1/salons/:id', () => {
  it('shows the overview with owner, completeness, offline reason and subscription', async () => {
    const id = addSalon('Glow', {
      completeness: { missing: ['COVER'], isComplete: false },
      offline: {
        reason: 'complaints',
        at: new Date('2026-10-01T10:00:00Z'),
        by: new Types.ObjectId(),
      },
    });
    membersM.docs.push({
      _id: new Types.ObjectId(),
      salonId: new Types.ObjectId(id),
      role: 'OWNER',
      firstName: 'Sami',
      lastName: 'N',
      phone: '+962791234567',
    });
    subsM.docs.push({
      _id: new Types.ObjectId(),
      salonId: new Types.ObjectId(id),
      status: 'ACTIVE',
      trialEndsAt: new Date('2026-12-01T00:00:00Z'),
      currentPeriodEnd: new Date('2027-01-01T00:00:00Z'),
    });
    const res = await request(app).get(`/admin/v1/salons/${id}`).set(admin());
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      name: 'Glow',
      completeness: { missing: ['COVER'], isComplete: false },
      offline: { reason: 'complaints', at: '2026-10-01T10:00:00.000Z' },
      owner: { firstName: 'Sami', phone: '+962791234567' },
      subscription: { status: 'ACTIVE', currentPeriodEnd: '2027-01-01T00:00:00.000Z' },
    });
    expect(
      (
        await request(app)
          .get(`/admin/v1/salons/${new Types.ObjectId().toHexString()}`)
          .set(admin())
      ).status,
    ).toBe(404);
    expect((await request(app).get('/admin/v1/salons/nope').set(admin())).status).toBe(400);
  });

  it('is empty-safe for a salon without owner, subscription or offline state', async () => {
    const id = addSalon('Lonely');
    const res = await request(app).get(`/admin/v1/salons/${id}`).set(admin());
    expect(bodyOf(res).data).toMatchObject({ owner: null, subscription: null, offline: null });
  });
});

describe('GET /admin/v1/salons/:id/members', () => {
  it('lists every member of that salon only, owner first, with effective permissions', async () => {
    const id = addSalon('Glow');
    const salonId = new Types.ObjectId(id);
    const member = (over: Record<string, unknown>): void => {
      membersM.docs.push({
        _id: new Types.ObjectId(),
        salonId,
        firstName: 'A',
        lastName: 'B',
        phone: '+962791110000',
        active: true,
        providesServices: false,
        permissions: [],
        createdAt: new Date(),
        ...over,
      });
    };
    member({
      role: 'EMPLOYEE',
      firstName: 'Eva',
      permissions: ['REVIEWS_VIEW'],
      providesServices: true,
    });
    member({ role: 'OWNER', firstName: 'Sami' });
    member({ role: 'MANAGER', firstName: 'Mo', active: false });
    membersM.docs.push({ _id: new Types.ObjectId(), salonId: new Types.ObjectId(), role: 'OWNER' });
    const res = await request(app).get(`/admin/v1/salons/${id}/members`).set(admin());
    expect(res.status).toBe(200);
    const rows = bodyOf(res).data as unknown as {
      name: string;
      role: string;
      active: boolean;
      permissions: string[];
    }[];
    expect(rows.map((r) => r.role)).toEqual(['OWNER', 'EMPLOYEE', 'MANAGER']);
    expect(rows[0]?.permissions).toHaveLength(15);
    expect(rows[1]?.permissions).toEqual(['REVIEWS_VIEW']);
    expect(rows[2]?.active).toBe(false);
  });
  it('is 404 for an unknown salon and 401 without a token', async () => {
    const unknown = new Types.ObjectId().toHexString();
    expect(
      (await request(app).get(`/admin/v1/salons/${unknown}/members`).set(admin())).status,
    ).toBe(404);
    expect((await request(app).get(`/admin/v1/salons/${unknown}/members`)).status).toBe(401);
  });
});

describe('PATCH /admin/v1/salons/:id/audience (§5.19)', () => {
  const patch = async (id: string, body: object): Promise<{ status: number; body: unknown }> =>
    await request(app).patch(`/admin/v1/salons/${id}/audience`).set(admin()).send(body);
  const catalog = (audience: string, businessType = 'SALON'): Types.ObjectId => {
    const _id = new Types.ObjectId();
    catalogM.docs.push({ _id, businessType, audience, active: true });
    return _id;
  };

  it('narrowing BOTH → MALE switches off services that no longer fit, clears bride flags, audits and notifies', async () => {
    const id = addSalon('Unity', { audience: 'BOTH' });
    const salonObj = new Types.ObjectId(id);
    const men = catalog('MALE');
    const women = catalog('FEMALE');
    const everyone = catalog('BOTH');
    servicesM.docs.push(
      {
        _id: new Types.ObjectId(),
        salonId: salonObj,
        catalogServiceId: men,
        active: true,
        brideOnly: false,
      },
      {
        _id: new Types.ObjectId(),
        salonId: salonObj,
        catalogServiceId: women,
        active: true,
        brideOnly: true,
      },
      {
        _id: new Types.ObjectId(),
        salonId: salonObj,
        catalogServiceId: everyone,
        active: true,
        brideOnly: true,
      },
      {
        _id: new Types.ObjectId(),
        salonId: new Types.ObjectId(),
        catalogServiceId: women,
        active: true,
        brideOnly: true,
      },
    );
    membersM.docs.push(
      {
        _id: new Types.ObjectId(),
        salonId: salonObj,
        role: 'EMPLOYEE',
        staff: { brideQualified: true, serviceIds: [] },
      },
      {
        _id: new Types.ObjectId(),
        salonId: new Types.ObjectId(),
        role: 'EMPLOYEE',
        staff: { brideQualified: true, serviceIds: [] },
      },
    );
    const res = await patch(id, { audience: 'MALE', reason: 'registered by mistake' });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({ businessType: 'SALON', audience: 'MALE' });
    expect(salonsM.docs[0]?.['audience']).toBe('MALE');
    expect(servicesM.docs.map((s) => [s['active'], s['brideOnly']])).toEqual([
      [true, false],
      [false, false],
      [true, false],
      [true, true],
    ]);
    expect((membersM.docs[0]?.['staff'] as { brideQualified: boolean }).brideQualified).toBe(false);
    expect((membersM.docs[1]?.['staff'] as { brideQualified: boolean }).brideQualified).toBe(true);
    expect(recomputes).toEqual([id]);
    expect(audits[0]).toMatchObject({
      action: 'SALON_CHANGE_AUDIENCE',
      reason: 'registered by mistake',
      before: { audience: 'BOTH' },
      after: { audience: 'MALE' },
      adminId,
    });
    expect(events).toEqual([
      { salonId: id, event: 'salon.audience_changed', reason: 'registered by mistake' },
    ]);
  });

  it('widening FEMALE → BOTH keeps services and bride qualifications, even with upcoming bookings', async () => {
    const id = addSalon('Glow');
    const salonObj = new Types.ObjectId(id);
    servicesM.docs.push({
      _id: new Types.ObjectId(),
      salonId: salonObj,
      catalogServiceId: catalog('FEMALE'),
      active: true,
      brideOnly: true,
    });
    membersM.docs.push({
      _id: new Types.ObjectId(),
      salonId: salonObj,
      role: 'EMPLOYEE',
      staff: { brideQualified: true, serviceIds: [] },
    });
    upcoming.list = [{ bookingId: 'bk1', startsAt: new Date(), status: 'APPROVED' }];
    expect((await patch(id, { audience: 'BOTH', reason: 'now for everyone' })).status).toBe(200);
    expect(salonsM.docs[0]?.['audience']).toBe('BOTH');
    expect(servicesM.docs[0]).toMatchObject({ active: true, brideOnly: true });
    expect((membersM.docs[0]?.['staff'] as { brideQualified: boolean }).brideQualified).toBe(true);
  });

  it('a clinic’s audience never changes (AUDIENCE_CHANGE_NOT_ALLOWED)', async () => {
    const id = addSalon('Glow Clinic', { businessType: 'CLINIC', audience: 'BOTH' });
    const res = await patch(id, { audience: 'FEMALE', reason: 'x' });
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe('AUDIENCE_CHANGE_NOT_ALLOWED');
    expect(salonsM.docs[0]?.['audience']).toBe('BOTH');
    expect(audits).toHaveLength(0);
  });

  it('refuses the same audience (422), a missing reason, a bad audience and an unknown salon; changes nothing', async () => {
    const id = addSalon('Glow');
    expect((await patch(id, { audience: 'FEMALE', reason: 'x' })).status).toBe(422);
    expect((await patch(id, { audience: 'MALE' })).status).toBe(400);
    expect((await patch(id, { audience: 'MALE', reason: ' ' })).status).toBe(400);
    expect((await patch(id, { audience: 'KIDS', reason: 'x' })).status).toBe(400);
    expect(
      (await patch(new Types.ObjectId().toHexString(), { audience: 'MALE', reason: 'x' })).status,
    ).toBe(404);
    expect(salonsM.docs[0]?.['audience']).toBe('FEMALE');
    expect(audits).toHaveLength(0);
  });

  it('narrowing is refused with the bookings while the salon has upcoming ones (§5.12), and changes nothing', async () => {
    const id = addSalon('Unity', { audience: 'BOTH' });
    upcoming.list = [{ bookingId: 'bk1', startsAt: new Date(), status: 'APPROVED' }];
    const res = await patch(id, { audience: 'FEMALE', reason: 'x' });
    expect(res.status).toBe(409);
    expect(bodyOf(res).error.code).toBe('SCHEDULE_CONFLICT');
    expect(bodyOf(res).error.details.map((d) => d.field)).toEqual(['bk1']);
    expect(salonsM.docs[0]?.['audience']).toBe('BOTH');
    expect(audits).toHaveLength(0);
  });

  it('succeeds when the notification fails', async () => {
    const id = addSalon('Glow');
    notifier.fail = true;
    expect((await patch(id, { audience: 'MALE', reason: 'x' })).status).toBe(200);
  });

  it('answers 503 when unconfigured', async () => {
    expect((await request(createApp({ logger })).get('/admin/v1/salons')).status).toBe(503);
  });
});
