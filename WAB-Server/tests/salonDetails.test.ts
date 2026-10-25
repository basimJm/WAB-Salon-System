import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createSalonDetailsService } from '../src/domain/salonDetails/salonDetails.service';
import type { FavoriteLookup } from '../src/domain/search/search.service';
import { optionalAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { GalleryRepository } from '../src/repositories/gallery.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { LeavesRepository } from '../src/repositories/leaves.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
// Monday 2026-10-12 11:00 in Amman.
const NOW = new Date('2026-10-12T08:00:00Z');
const m = {
  salons: createFakeModel(),
  members: createFakeModel(),
  services: createFakeModel(),
  catalog: createFakeModel(),
  gallery: createFakeModel(),
  closures: createFakeModel(),
  leaves: createFakeModel(),
};
const saved = new Set<string>();
const favorites: FavoriteLookup = {
  among: (_c, ids) => Promise.resolve(new Set(ids.filter((id) => saved.has(id)))),
};
const app = createApp({
  logger,
  services: {
    salonDetails: createSalonDetailsService({
      salons: new SalonsRepository(m.salons.model as never),
      members: new MembersRepository(m.members.model as never),
      salonServices: new SalonServicesRepository(m.services.model as never),
      catalog: new CatalogServicesRepository(m.catalog.model as never),
      gallery: new GalleryRepository(m.gallery.model as never),
      closures: new ClosuresRepository(m.closures.model as never),
      leaves: new LeavesRepository(m.leaves.model as never),
      storage: new FakeStorageProvider(),
      settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
      favorites,
      reviews: {
        latest: ({ staffId, limit }) =>
          Promise.resolve([
            {
              id: staffId === undefined ? 'salon-review' : 'staff-review',
              customerName: `top ${String(limit)}`,
              rating: 5,
              comment: null,
              createdAt: NOW,
              branch: null,
            },
          ]),
      },
      now: () => NOW,
    }),
    installations: {
      service: undefined as never,
      customerOptional: optionalAuth('customer', SECRET),
      customerRequired: optionalAuth('customer', SECRET),
      merchantRequired: optionalAuth('merchant', SECRET),
    },
  },
});

interface Body {
  data: Record<string, unknown> & {
    staff: { id: string; status: string; firstName: string }[];
    services: { name: string; price: string }[];
    gallery: unknown[];
    upcomingClosures: { reason: string }[];
  };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const id = (): Types.ObjectId => new Types.ObjectId();
const week = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
  day,
  isOff: day === 'FRI',
  open: '09:00',
  close: '18:00',
}));
const salonId = id();
const catalogId = id();
const serviceId = id();

const addSalon = (over: Record<string, unknown> = {}): void => {
  m.salons.docs.push({
    _id: salonId,
    name: 'Glow',
    gender: 'FEMALE',
    state: 'LIVE',
    completeness: { missing: [], isComplete: true },
    rating: { avg: 4.5, count: 8 },
    weeklySchedule: week,
    coverKey: 'salons/cover.jpg',
    profileKey: 'salons/p.jpg',
    description: 'Nice',
    locationText: 'Amman',
    location: { type: 'Point', coordinates: [35.9, 31.9] },
    phone: '+962791111111',
    ...over,
  });
};
const addStaff = (over: Record<string, unknown> = {}): Types.ObjectId => {
  const _id = id();
  m.members.docs.push({
    _id,
    salonId,
    firstName: 'Lina',
    lastName: 'Secret',
    role: 'EMPLOYEE',
    active: true,
    providesServices: true,
    staff: {
      bio: 'Colorist',
      yearsOfExperience: 5,
      serviceIds: [serviceId],
      workingDays: [{ day: 'MON' }],
      rating: { avg: 4, count: 2 },
      customersCount: 30,
    },
    ...over,
  });
  return _id;
};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  saved.clear();
  m.catalog.docs.push({
    _id: catalogId,
    name: { ar: 'قص', en: 'Haircut' },
    description: { ar: 'وصف', en: 'Desc' },
    imageKey: 'catalog/h.jpg',
  });
});

const get = (path: string, headers: Record<string, string> = {}): request.Test =>
  request(app).get(`/customer/v1/salons/${path}`).set(headers);

describe('GET /customer/v1/salons/:salonId', () => {
  it('returns the full profile with today’s status, services, staff, gallery and closures', async () => {
    addSalon();
    addStaff();
    m.services.docs.push(
      {
        _id: id(),
        salonId,
        catalogServiceId: catalogId,
        price: 12500,
        durationMinutes: 45,
        active: true,
        mediaKeys: [],
      },
      {
        _id: id(),
        salonId,
        catalogServiceId: id(),
        price: 1000,
        durationMinutes: 10,
        active: false,
        mediaKeys: [],
      },
    );
    m.gallery.docs.push({ _id: id(), salonId, type: 'IMAGE', key: 'g/1.jpg', order: 0 });
    m.closures.docs.push(
      { _id: id(), salonId, from: '2026-10-20', to: '2026-10-22', reason: 'Holiday' },
      { _id: id(), salonId, from: '2026-01-01', to: '2026-01-02', reason: 'Past' },
    );
    const res = await get(salonId.toHexString(), { 'Accept-Language': 'en' });
    expect(res.status).toBe(200);
    const d = bodyOf(res).data;
    expect(d['name']).toBe('Glow');
    expect(d['isOpenNow']).toBe(true);
    expect(d['todayHours']).toEqual({ open: '09:00', close: '18:00' });
    expect(d['location']).toEqual({ lat: 31.9, lng: 35.9 });
    expect(d['whatsapp']).toBeNull();
    expect(d['isFavorite']).toBe(false);
    expect(d.services).toEqual([expect.objectContaining({ name: 'Haircut', price: '12.500' })]);
    expect(d.gallery).toHaveLength(1);
    expect(d.upcomingClosures.map((c) => c.reason)).toEqual(['Holiday']);
    expect(d.staff).toEqual([expect.objectContaining({ firstName: 'Lina', status: 'ON_DUTY' })]);
    expect(JSON.stringify(d)).not.toContain('Secret');
  });

  it('answers in Arabic by default', async () => {
    addSalon();
    m.services.docs.push({
      _id: id(),
      salonId,
      catalogServiceId: catalogId,
      price: 1000,
      durationMinutes: 10,
      active: true,
      mediaKeys: [],
    });
    expect(bodyOf(await get(salonId.toHexString())).data.services[0]?.name).toBe('قص');
  });

  it('reports a closure today as closed with its reason', async () => {
    addSalon();
    m.closures.docs.push({
      _id: id(),
      salonId,
      from: '2026-10-12',
      to: '2026-10-12',
      reason: 'Eid',
    });
    const d = bodyOf(await get(salonId.toHexString())).data;
    expect(d['isOpenNow']).toBe(false);
    expect(d['closedReason']).toBe('Eid');
  });

  it.each([
    ['not LIVE', { state: 'OFFLINE' }],
    ['incomplete', { completeness: { missing: ['COVER'], isComplete: false } }],
  ])('hides a salon that is %s', async (_n, over) => {
    addSalon(over);
    const res = await get(salonId.toHexString());
    expect(res.status).toBe(404);
    expect(bodyOf(res).error.code).toBe('SALON_NOT_FOUND');
  });

  it('404s for an unknown salon and 400s for a malformed id', async () => {
    expect((await get(id().toHexString())).status).toBe(404);
    expect((await get('nope')).status).toBe(400);
  });

  it('flags favorites for a signed-in customer; a bad token is refused', async () => {
    addSalon();
    saved.add(salonId.toHexString());
    const token = signAccessToken({
      secret: SECRET,
      subjectType: 'CUSTOMER',
      subjectId: id().toHexString(),
      ttlSec: 600,
    }).token;
    const ok = await get(salonId.toHexString(), { Authorization: `Bearer ${token}` });
    expect(bodyOf(ok).data['isFavorite']).toBe(true);
    expect((await get(salonId.toHexString(), { Authorization: 'Bearer x' })).status).toBe(401);
  });

  it('shows staff on leave today and staff on a day off', async () => {
    addSalon();
    const onLeave = addStaff({ firstName: 'Sara' });
    addStaff({
      firstName: 'Dina',
      staff: {
        serviceIds: [],
        workingDays: [{ day: 'TUE' }],
        rating: { avg: 0, count: 0 },
        customersCount: 0,
      },
    });
    addStaff({ firstName: 'Gone', active: false });
    addStaff({ firstName: 'Reception', providesServices: false });
    m.leaves.docs.push({
      _id: id(),
      salonId,
      memberId: onLeave,
      from: '2026-10-11',
      to: '2026-10-13',
    });
    const staff = bodyOf(await get(salonId.toHexString())).data.staff;
    expect(Object.fromEntries(staff.map((s) => [s.firstName, s.status]))).toEqual({
      Sara: 'ON_LEAVE',
      Dina: 'DAY_OFF',
    });
  });
});

describe('review previews', () => {
  it('shows the rating and the latest three reviews on the salon and the staff sheet', async () => {
    addSalon();
    const member = addStaff();
    const salon = bodyOf(await get(salonId.toHexString())).data['reviews'];
    expect(salon).toMatchObject({
      avg: 4.5,
      count: 8,
      latest: [{ id: 'salon-review', customerName: 'top 3' }],
    });
    const staff = bodyOf(await get(`${salonId.toHexString()}/staff/${member.toHexString()}`)).data;
    expect(staff['reviews']).toMatchObject({
      avg: 4,
      count: 2,
      latest: [{ id: 'staff-review' }],
    });
  });
});

describe('GET /customer/v1/salons/:salonId/staff/:memberId', () => {
  it('returns the staff sheet with only the services the salon offers', async () => {
    addSalon();
    const member = addStaff({ role: 'MANAGER' });
    m.services.docs.push({
      _id: serviceId,
      salonId,
      catalogServiceId: catalogId,
      price: 1000,
      durationMinutes: 10,
      active: true,
      mediaKeys: [],
    });
    const res = await get(`${salonId.toHexString()}/staff/${member.toHexString()}`, {
      'Accept-Language': 'en',
    });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      firstName: 'Lina',
      role: 'MANAGER',
      bio: 'Colorist',
      yearsOfExperience: 5,
      customersCount: 30,
      status: 'ON_DUTY',
      services: [{ id: serviceId.toHexString(), name: 'Haircut' }],
      workingDays: [{ day: 'MON', start: null, end: null }],
    });
    expect(JSON.stringify(res.body)).not.toContain('Secret');
  });

  it('404s for a member of another salon, an inactive or non-staff member, or a hidden salon', async () => {
    addSalon();
    const other = addStaff({ salonId: id() });
    const inactive = addStaff({ active: false });
    const plain = addStaff({ providesServices: false });
    for (const member of [other, inactive, plain, id()]) {
      expect((await get(`${salonId.toHexString()}/staff/${member.toHexString()}`)).status).toBe(
        404,
      );
    }
    m.salons.docs.forEach((d) => {
      d['state'] = 'OFFLINE';
    });
    const ok = addStaff();
    expect((await get(`${salonId.toHexString()}/staff/${ok.toHexString()}`)).status).toBe(404);
  });
});
