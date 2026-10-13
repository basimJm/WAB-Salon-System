import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import {
  createSearchService,
  type FavoriteLookup,
  type RecommendedLookup,
} from '../src/domain/search/search.service';
import { optionalAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
// Monday 2026-10-12 11:00 in Amman.
const NOW = new Date('2026-10-12T08:00:00Z');
const salonsM = createFakeModel();
const servicesM = createFakeModel();
const closuresM = createFakeModel();
const recommended: { ids: string[] } & RecommendedLookup = {
  ids: [],
  salonIds() {
    return Promise.resolve(this.ids);
  },
};
const saved: { ids: Set<string>; asked: string[] } = { ids: new Set(), asked: [] };
const favorites: FavoriteLookup = {
  among(customerId, ids) {
    saved.asked.push(customerId);
    return Promise.resolve(new Set(ids.filter((id) => saved.ids.has(id))));
  },
};
const app = createApp({
  logger,
  services: {
    search: createSearchService({
      salons: new SalonsRepository(salonsM.model as never),
      salonServices: new SalonServicesRepository(servicesM.model as never),
      closures: new ClosuresRepository(closuresM.model as never),
      storage: new FakeStorageProvider(),
      settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
      recommended,
      favorites,
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

interface Card {
  id: string;
  name: string;
  rating: number;
  isOpenNow: boolean;
  todayHours: { open: string; close: string } | null;
  isFavorite: boolean;
  profileImageUrl: string | null;
  shortDescription: string | null;
}
interface Body {
  data: Card[] & { priceRange: { min: string; max: string } | null };
  meta?: { total: number };
  error: { details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const week = (off: string[] = []): object[] =>
  ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
    day,
    isOff: off.includes(day),
    open: '09:00',
    close: '18:00',
  }));
const addSalon = (name: string, over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  salonsM.docs.push({
    _id,
    name,
    searchText: `${name} Amman`,
    gender: 'FEMALE',
    state: 'LIVE',
    completeness: { missing: [], isComplete: true },
    rating: { avg: 4, count: 10 },
    weeklySchedule: week(),
    description: 'A nice place',
    profileKey: 'salons/p.jpg',
    locationText: 'Amman, Gardens',
    ...over,
  });
  return _id.toHexString();
};
const offer = (salonId: string, catalogId: string, price: number, active = true): void => {
  servicesM.docs.push({
    _id: new Types.ObjectId(),
    salonId: new Types.ObjectId(salonId),
    catalogServiceId: new Types.ObjectId(catalogId),
    price,
    active,
  });
};
const names = async (query: string): Promise<string[]> => {
  const res = await request(app).get(`/customer/v1/salons?${query}`);
  expect(res.status).toBe(200);
  return bodyOf(res).data.map((c) => c.name);
};
const c1 = new Types.ObjectId().toHexString();
const c2 = new Types.ObjectId().toHexString();

beforeEach(() => {
  for (const f of [salonsM, servicesM, closuresM]) f.docs.length = 0;
  recommended.ids = [];
  saved.ids = new Set();
  saved.asked = [];
});

describe('GET /customer/v1/salons', () => {
  it('shows only LIVE, complete salons of the requested gender; the gender is required', async () => {
    addSalon('Visible');
    addSalon('Men', { gender: 'MALE' });
    addSalon('Pending', { state: 'APPLICATION_PENDING' });
    addSalon('Offline', { state: 'OFFLINE' });
    addSalon('Incomplete', { completeness: { missing: ['COVER'], isComplete: false } });
    expect(await names('gender=FEMALE')).toEqual(['Visible']);
    expect(await names('gender=MALE')).toEqual(['Men']);
    expect((await request(app).get('/customer/v1/salons')).status).toBe(400);
    expect((await request(app).get('/customer/v1/salons?gender=BOTH')).status).toBe(400);
  });

  it('cards carry rating, image URL, short description and today’s hours', async () => {
    addSalon('Glow', { description: 'x'.repeat(300) });
    const res = await request(app).get('/customer/v1/salons?gender=FEMALE');
    const card = bodyOf(res).data[0];
    expect(card).toMatchObject({
      name: 'Glow',
      rating: 4,
      isOpenNow: true,
      todayHours: { open: '09:00', close: '18:00' },
      isFavorite: false,
    });
    expect(card?.profileImageUrl).toContain('salons/p.jpg');
    expect(card?.shortDescription).toHaveLength(120);
  });

  it('open now follows Amman time, day-offs and closures', async () => {
    addSalon('DayOff', { weeklySchedule: week(['MON']) });
    const closed = addSalon('Closed');
    closuresM.docs.push({
      _id: new Types.ObjectId(),
      salonId: new Types.ObjectId(closed),
      from: '2026-10-12',
      to: '2026-10-13',
      reason: 'Trip',
    });
    addSalon('Open');
    const res = await request(app).get('/customer/v1/salons?gender=FEMALE&pageSize=10');
    const byName = Object.fromEntries(bodyOf(res).data.map((c) => [c.name, c]));
    expect(byName['Open']).toMatchObject({ isOpenNow: true });
    expect(byName['DayOff']).toMatchObject({ isOpenNow: false, todayHours: null });
    expect(byName['Closed']).toMatchObject({ isOpenNow: false, todayHours: null });
  });

  it('searches by name or location text, case-insensitively, treating the text literally', async () => {
    addSalon('Glow Beauty');
    addSalon('Barbie Nails', { searchText: 'Barbie Nails Irbid' });
    expect(await names('gender=FEMALE&q=glow')).toEqual(['Glow Beauty']);
    expect(await names('gender=FEMALE&q=IRBID')).toEqual(['Barbie Nails']);
    expect(await names('gender=FEMALE&q=.*')).toEqual([]);
    expect(await names('gender=FEMALE&q=')).toHaveLength(2);
  });

  it('requires ALL selected services and filters on the SUM of their prices', async () => {
    const a = addSalon('A');
    const b = addSalon('B');
    const c = addSalon('C');
    offer(a, c1, 10_000);
    offer(a, c2, 15_000); // 25.000
    offer(b, c1, 5_000);
    offer(b, c2, 8_000); // 13.000
    offer(c, c1, 1_000); // only one service
    expect((await names(`gender=FEMALE&serviceIds=${c1},${c2}`)).sort()).toEqual(['A', 'B']);
    expect(await names(`gender=FEMALE&serviceIds=${c1}&serviceIds=${c2}&minPrice=20.000`)).toEqual([
      'A',
    ]);
    expect(await names(`gender=FEMALE&serviceIds=${c1},${c2}&maxPrice=13.000`)).toEqual(['B']);
    expect(
      await names(`gender=FEMALE&serviceIds=${c1},${c2}&minPrice=13.000&maxPrice=25.000`),
    ).toHaveLength(2);
    expect(await names(`gender=FEMALE&serviceIds=${c1},${c2}&minPrice=26.000`)).toEqual([]);
    expect((await names(`gender=FEMALE&serviceIds=${c1}`)).sort()).toEqual(['A', 'B', 'C']);
  });

  it('ignores inactive services and salons that are not visible', async () => {
    const a = addSalon('A');
    const hidden = addSalon('Hidden', { state: 'OFFLINE' });
    offer(a, c1, 1_000, false);
    offer(hidden, c1, 1_000);
    expect(await names(`gender=FEMALE&serviceIds=${c1}`)).toEqual([]);
  });

  it('filters by minimum rating (stars and above) and orders by rating', async () => {
    addSalon('Four', { rating: { avg: 4, count: 3 } });
    addSalon('Five', { rating: { avg: 5, count: 1 } });
    addSalon('Two', { rating: { avg: 2, count: 9 } });
    expect(await names('gender=FEMALE')).toEqual(['Five', 'Four', 'Two']);
    expect(await names('gender=FEMALE&minRating=4')).toEqual(['Five', 'Four']);
    expect(await names('gender=FEMALE&minRating=5')).toEqual(['Five']);
    expect((await request(app).get('/customer/v1/salons?gender=FEMALE&minRating=6')).status).toBe(
      400,
    );
    expect((await request(app).get('/customer/v1/salons?gender=FEMALE&minRating=0')).status).toBe(
      400,
    );
  });

  it('recommended keeps only recommended salons (and combines with other filters)', async () => {
    const a = addSalon('A');
    addSalon('B');
    expect(await names('gender=FEMALE&general=RECOMMENDED')).toEqual([]);
    recommended.ids = [a];
    expect(await names('gender=FEMALE&general=RECOMMENDED')).toEqual(['A']);
    expect(await names('gender=FEMALE&general=RECOMMENDED&q=B')).toEqual([]);
    expect(
      (await request(app).get('/customer/v1/salons?gender=FEMALE&general=NEAREST')).status,
    ).toBe(400);
  });

  it('paginates by 10 and reports the total', async () => {
    for (let i = 0; i < 12; i += 1)
      addSalon(`S${String(i).padStart(2, '0')}`, { rating: { avg: 3, count: i } });
    const first = await request(app).get('/customer/v1/salons?gender=FEMALE');
    expect(bodyOf(first).data).toHaveLength(10);
    expect(bodyOf(first).meta?.total).toBe(12);
    expect(
      bodyOf(await request(app).get('/customer/v1/salons?gender=FEMALE&page=2')).data,
    ).toHaveLength(2);
  });

  it.each([
    ['a price without services', 'minPrice=5.000'],
    ['an inverted range', `serviceIds=${c1}&minPrice=9.000&maxPrice=1.000`],
    ['a non-JOD price', `serviceIds=${c1}&minPrice=5.0001`],
    ['a malformed service id', 'serviceIds=nope'],
    ['21 services', `serviceIds=${Array.from({ length: 21 }, () => c1).join(',')}`],
    ['a long search text', `q=${'x'.repeat(81)}`],
  ])('rejects %s', async (_n, query) => {
    const res = await request(app).get(`/customer/v1/salons?gender=FEMALE&${query}`);
    expect(res.status).toBe(400);
  });

  it('marks favorites for a signed-in customer only; a bad token is refused, no token is a guest', async () => {
    const a = addSalon('A');
    addSalon('B');
    saved.ids = new Set([a]);
    const customerId = new Types.ObjectId().toHexString();
    const token = signAccessToken({
      secret: SECRET,
      subjectType: 'CUSTOMER',
      subjectId: customerId,
      ttlSec: 600,
    }).token;
    const res = await request(app)
      .get('/customer/v1/salons?gender=FEMALE')
      .set('Authorization', `Bearer ${token}`);
    expect(Object.fromEntries(bodyOf(res).data.map((c) => [c.name, c.isFavorite]))).toEqual({
      A: true,
      B: false,
    });
    expect(saved.asked).toEqual([customerId]);
    const guest = await request(app).get('/customer/v1/salons?gender=FEMALE');
    expect(bodyOf(guest).data.every((c) => !c.isFavorite)).toBe(true);
    expect(
      (
        await request(app)
          .get('/customer/v1/salons?gender=FEMALE')
          .set('Authorization', 'Bearer junk')
      ).status,
    ).toBe(401);
  });

  it('answers 503 when unconfigured', async () => {
    expect(
      (await request(createApp({ logger })).get('/customer/v1/salons?gender=FEMALE')).status,
    ).toBe(503);
  });
});

describe('GET /customer/v1/salons/filters', () => {
  it('gives the price slider bounds over visible salons offering all selected services', async () => {
    const a = addSalon('A');
    const b = addSalon('B');
    const hidden = addSalon('Hidden', { state: 'OFFLINE' });
    offer(a, c1, 10_000);
    offer(a, c2, 15_000);
    offer(b, c1, 5_000);
    offer(b, c2, 8_000);
    offer(hidden, c1, 1);
    offer(hidden, c2, 1);
    const res = await request(app).get(
      `/customer/v1/salons/filters?gender=FEMALE&serviceIds=${c1},${c2}`,
    );
    expect(bodyOf(res).data).toEqual({ priceRange: { min: '13.000', max: '25.000' } });
  });

  it('is null when no salon offers all of them, and needs gender and services', async () => {
    addSalon('A');
    const res = await request(app).get(
      `/customer/v1/salons/filters?gender=FEMALE&serviceIds=${c1}`,
    );
    expect(bodyOf(res).data).toEqual({ priceRange: null });
    expect((await request(app).get('/customer/v1/salons/filters?gender=FEMALE')).status).toBe(400);
    expect((await request(app).get(`/customer/v1/salons/filters?serviceIds=${c1}`)).status).toBe(
      400,
    );
  });
});
