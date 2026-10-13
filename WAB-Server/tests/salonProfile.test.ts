import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createSalonProfileService } from '../src/domain/salons/salonProfile.service';
import { createSalonStateService } from '../src/domain/salons/salonState.service';
import type { UploadVerifier } from '../src/domain/uploads/uploads.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { FakeStorageProvider } from '../src/providers/storage';
import { MembersRepository } from '../src/repositories/identity.repository';
import { AreasRepository, CitiesRepository } from '../src/repositories/locations.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const cityId = new Types.ObjectId();
const areaId = new Types.ObjectId();
const otherCity = new Types.ObjectId();
const salonId = new Types.ObjectId();
const salons = createFakeModel();
const members = createFakeModel();
const cities = createFakeModel([
  { _id: cityId, active: true },
  { _id: otherCity, active: true },
]);
const areas = createFakeModel([{ _id: areaId, cityId, active: true }]);
const facts = { services: 1, staff: 1 };
const events: Record<string, unknown>[] = [];
const salonRepo = new SalonsRepository(salons.model as never);
const state = createSalonStateService({
  salons: salonRepo,
  facts: {
    activeServiceCount: () => Promise.resolve(facts.services),
    qualifiedStaffCount: () => Promise.resolve(facts.staff),
  },
  audit: createAuditWriter({ append: () => Promise.reject(new Error('unused')) }),
  notifier: {
    changed: (change) => {
      events.push(change);
      return Promise.resolve();
    },
  },
  logger,
});
const app = createApp({
  logger,
  services: {
    salonProfile: {
      service: createSalonProfileService({
        salons: salonRepo,
        cities: new CitiesRepository(cities.model as never),
        areas: new AreasRepository(areas.model as never),
        storage: new FakeStorageProvider(),
        state,
      }),
      guard: [
        requireAuth('merchant', SECRET),
        loadMember(new MembersRepository(members.model as never)),
      ],
    },
  },
});

interface Body {
  data: Record<string, unknown> & { completeness: { missing: string[]; isComplete: boolean } };
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const token = (id: string): string =>
  signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: id, ttlSec: 600 }).token;
const addMember = (
  role: string,
  permissions: string[],
  over: Record<string, unknown> = {},
): string => {
  const _id = new Types.ObjectId();
  members.docs.push({ _id, salonId, role, permissions, active: true, ...over });
  return _id.toHexString();
};
const POLICY = {
  cancellationWindowHours: 2,
  paymentOptions: ['PAY_ON_ARRIVAL'],
  depositRefundableOnCustomerCancel: true,
  fullPaymentRefundOnCustomerCancel: 'FULL',
  noShowDeposit: 'KEEP',
  noShowFullPayment: 'KEEP',
};
const addSalon = (stateName: string, over: Record<string, unknown> = {}): void => {
  salons.docs.push({
    _id: salonId,
    name: 'Glow',
    gender: 'FEMALE',
    state: stateName,
    weeklySchedule: [{ day: 'SUN', isOff: false, open: '09:00', close: '18:00' }],
    policy: POLICY,
    completeness: { missing: [], isComplete: false },
    rating: { avg: 0, count: 0 },
    application: { submittedAt: new Date(), resubmissionCount: 0, documentKeys: ['k'] },
    ...over,
  });
};
const patch = async (id: string, body: object): Promise<{ status: number; body: unknown }> =>
  await request(app)
    .patch('/merchant/v1/salon/profile')
    .set('Authorization', `Bearer ${token(id)}`)
    .send(body);
const COMPLETING = {
  coverKey: 'salons/cover.jpg',
  profileKey: 'salons/profile.jpg',
  description: 'The best salon',
  phone: '+962791234567',
  location: { latitude: 31.95, longitude: 35.91 },
};

beforeEach(() => {
  for (const f of [salons, members]) f.docs.length = 0;
  events.length = 0;
  facts.services = 1;
  facts.staff = 1;
});

describe('GET /merchant/v1/salon', () => {
  it('shows the salon with URLs and what is missing to any active member', async () => {
    addSalon('APPROVED_INCOMPLETE', { coverKey: 'salons/cover.jpg' });
    const employee = addMember('EMPLOYEE', ['REVIEWS_VIEW']);
    const res = await request(app)
      .get('/merchant/v1/salon')
      .set('Authorization', `Bearer ${token(employee)}`);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      name: 'Glow',
      state: 'APPROVED_INCOMPLETE',
      location: null,
    });
    expect(String(bodyOf(res).data['coverUrl'])).toContain('salons/cover.jpg');
    expect(bodyOf(res).data['profileUrl']).toBeNull();
  });

  it('needs a merchant token and an active member', async () => {
    addSalon('LIVE');
    expect((await request(app).get('/merchant/v1/salon')).status).toBe(401);
    const off = addMember('OWNER', [], { active: false });
    expect(
      (
        await request(app)
          .get('/merchant/v1/salon')
          .set('Authorization', `Bearer ${token(off)}`)
      ).status,
    ).toBe(403);
  });
});

describe('PATCH /merchant/v1/salon/profile', () => {
  it('saves fields, stores the location as a GeoJSON point [lng, lat] and rebuilds searchText', async () => {
    addSalon('APPROVED_INCOMPLETE');
    const owner = addMember('OWNER', []);
    const res = await patch(owner, { ...COMPLETING, name: 'Glow Studio', locationText: 'Abdoun' });
    expect(res.status).toBe(200);
    expect(salons.docs[0]).toMatchObject({
      name: 'Glow Studio',
      location: { type: 'Point', coordinates: [35.91, 31.95] },
      phone: '+962791234567',
      searchText: 'Glow Studio Abdoun',
    });
    expect(bodyOf(res).data['location']).toEqual({ latitude: 31.95, longitude: 35.91 });
  });

  it('goes LIVE as soon as the last missing item is filled', async () => {
    addSalon('APPROVED_INCOMPLETE');
    const owner = addMember('OWNER', []);
    const res = await patch(owner, COMPLETING);
    expect(bodyOf(res).data).toMatchObject({
      state: 'LIVE',
      completeness: { missing: [], isComplete: true },
    });
    expect(salons.docs[0]?.['state']).toBe('LIVE');
    expect(events).toEqual([{ salonId: salonId.toHexString(), event: 'salon.live' }]);
  });

  it('reports what is still missing and stays APPROVED_INCOMPLETE', async () => {
    addSalon('APPROVED_INCOMPLETE');
    const res = await patch(addMember('OWNER', []), { description: 'only this' });
    expect(bodyOf(res).data.completeness.missing).toEqual([
      'COVER',
      'PROFILE_IMAGE',
      'LOCATION',
      'PHONE',
    ]);
    expect(bodyOf(res).data['state']).toBe('APPROVED_INCOMPLETE');
  });

  it('works while the application is still pending (PRD: prepare the profile early) without changing state', async () => {
    addSalon('APPLICATION_PENDING');
    const res = await patch(addMember('OWNER', []), COMPLETING);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data['state']).toBe('APPLICATION_PENDING');
  });

  it('null clears optional fields (and they become missing again)', async () => {
    addSalon('LIVE', {
      ...COMPLETING,
      coverKey: 'a/b.jpg',
      location: { type: 'Point', coordinates: [35.9, 31.9] },
    });
    const res = await patch(addMember('OWNER', []), {
      coverKey: null,
      whatsapp: null,
      location: null,
    });
    expect(salons.docs[0]?.['coverKey']).toBeUndefined();
    expect(salons.docs[0]?.['location']).toBeUndefined();
    expect(bodyOf(res).data.completeness.missing).toEqual(
      expect.arrayContaining(['COVER', 'LOCATION']),
    );
  });

  it('needs SALON_PROFILE_MANAGE: owner and granted managers pass, others get 403', async () => {
    addSalon('LIVE');
    expect(
      (await patch(addMember('MANAGER', ['SALON_PROFILE_MANAGE']), { description: 'x' })).status,
    ).toBe(200);
    const denied = await patch(addMember('MANAGER', ['REVIEWS_VIEW']), { description: 'x' });
    expect(denied.status).toBe(403);
    expect(bodyOf(denied).error.code).toBe('PERMISSION_DENIED');
  });

  it('validates the city/area pair against the data', async () => {
    addSalon('LIVE', { cityId });
    const owner = addMember('OWNER', []);
    expect((await patch(owner, { areaId: areaId.toHexString() })).status).toBe(200);
    const wrongCity = await patch(owner, {
      cityId: otherCity.toHexString(),
      areaId: areaId.toHexString(),
    });
    expect(wrongCity.status).toBe(400);
    expect(bodyOf(wrongCity).error.details.map((d) => d.field)).toContain('body.areaId');
    const unknown = await patch(owner, { cityId: new Types.ObjectId().toHexString() });
    expect(bodyOf(unknown).error.details.map((d) => d.field)).toContain('body.cityId');
  });

  it.each([
    ['empty body', {}],
    ['blank name', { name: ' ' }],
    ['bad phone', { phone: '0791234567' }],
    ['latitude out of range', { location: { latitude: 91, longitude: 0 } }],
    ['longitude out of range', { location: { latitude: 0, longitude: 181 } }],
    ['path traversal key', { coverKey: '../x' }],
    ['phone cannot be cleared', { phone: null }],
    ['long description', { description: 'x'.repeat(1001) }],
  ])('rejects %s and changes nothing', async (_name, body) => {
    addSalon('LIVE');
    const res = await patch(addMember('OWNER', []), body);
    expect(res.status).toBe(400);
    expect(salons.docs[0]?.['name']).toBe('Glow');
  });

  it('only touches the caller’s own salon', async () => {
    addSalon('LIVE');
    const other = new Types.ObjectId();
    salons.docs.push({
      _id: other,
      name: 'Other',
      gender: 'MALE',
      state: 'LIVE',
      weeklySchedule: [],
      completeness: { missing: [], isComplete: false },
      rating: { avg: 0, count: 0 },
      application: { submittedAt: new Date(), resubmissionCount: 0, documentKeys: [] },
    });
    await patch(addMember('OWNER', []), { description: 'mine' });
    expect(salons.docs[1]?.['description']).toBeUndefined();
  });

  it('answers 503 when unconfigured', async () => {
    expect((await request(createApp({ logger })).get('/merchant/v1/salon')).status).toBe(503);
  });
});

describe('images must be confirmed uploads of this salon', () => {
  const checks: Parameters<UploadVerifier['assertConfirmed']>[0][] = [];
  const strict = createApp({
    logger,
    services: {
      salonProfile: {
        service: createSalonProfileService({
          salons: salonRepo,
          cities: new CitiesRepository(cities.model as never),
          areas: new AreasRepository(areas.model as never),
          storage: new FakeStorageProvider(),
          state,
          uploads: {
            assertConfirmed: (input) => {
              checks.push(input);
              return input.keys.includes('salons/bad.jpg')
                ? Promise.reject(new Error('UPLOAD_INVALID'))
                : Promise.resolve();
            },
          },
        }),
        guard: [
          requireAuth('merchant', SECRET),
          loadMember(new MembersRepository(members.model as never)),
        ],
      },
    },
  });
  const send = async (id: string, body: object): Promise<{ status: number }> =>
    await request(strict)
      .patch('/merchant/v1/salon/profile')
      .set('Authorization', `Bearer ${token(id)}`)
      .send(body);

  it('verifies a changed cover/profile key with the right purpose and salon, and skips unchanged ones', async () => {
    checks.length = 0;
    addSalon('LIVE', { coverKey: 'salons/cover/old.jpg' });
    const owner = addMember('OWNER', []);
    expect(
      (
        await send(owner, {
          coverKey: 'salons/cover/new.jpg',
          profileKey: 'salons/profile/new.jpg',
        })
      ).status,
    ).toBe(200);
    expect(checks.map((c) => c.purpose)).toEqual(['SALON_COVER', 'SALON_PROFILE']);
    expect(checks[0]?.accept?.({ salonId: salonId.toHexString() } as never)).toBe(true);
    expect(checks[0]?.accept?.({ salonId: 'x' } as never)).toBe(false);
    checks.length = 0;
    expect((await send(owner, { coverKey: 'salons/cover/new.jpg' })).status).toBe(200);
    expect(checks).toHaveLength(0);
    expect((await send(owner, { coverKey: null })).status).toBe(200);
    expect(checks).toHaveLength(0);
  });

  it('refuses an unconfirmed key and saves nothing', async () => {
    addSalon('LIVE');
    const res = await send(addMember('OWNER', []), {
      coverKey: 'salons/bad.jpg',
      description: 'changed',
    });
    expect(res.status).toBe(500);
    expect(salons.docs[0]?.['description']).toBeUndefined();
  });
});
