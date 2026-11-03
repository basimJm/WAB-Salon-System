import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { HOME_SECTION_SIZE } from '../src/constants/home';
import { createHomeService, type UnreadLookup } from '../src/domain/home/home.service';
import type { SearchService } from '../src/domain/search/search.service';
import { optionalAuth } from '../src/middlewares/auth';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const customerId = new Types.ObjectId().toHexString();

const calls: { query: Record<string, unknown>; customerId?: string | undefined }[] = [];
const catalogCalls: Record<string, unknown>[] = [];
let salonTotal = 3;
const cardOf = (name: string, businessType = 'SALON'): object => ({ id: name, name, businessType });
const lensOf = (types: readonly string[] | undefined): string => (types ?? []).join('+');
const search: Pick<SearchService, 'search' | 'cards'> = {
  search: ({ query, params, customerId: who }) => {
    calls.push({ query: { ...query }, customerId: who });
    return Promise.resolve({
      items: [cardOf(`${query.general ?? 'nearest'}:${lensOf(query.businessTypes)}`)] as never,
      meta: { ...params, total: salonTotal },
    });
  },
  cards: ({ ids }) =>
    Promise.resolve(
      ids.map((id) => cardOf(id, id.startsWith('ink') ? 'TATTOO' : 'SALON')) as never,
    ),
};
let serviceTotal = 2;
const unread: UnreadLookup = { count: () => Promise.resolve(120) };
const home = createHomeService({
  banners: {
    live: (gender, language) => Promise.resolve([{ id: `${gender}-${language}` }] as never),
  },
  catalog: {
    list: ({ params, businessType }) => {
      catalogCalls.push({ businessType, pageSize: params.pageSize });
      const label = Array.isArray(businessType)
        ? businessType.join('+')
        : ((businessType as string | undefined) ?? 'all');
      // Explore candidates: three services in the admin's order.
      const items =
        params.pageSize === HOME_SECTION_SIZE
          ? [{ id: label }]
          : [{ id: 'cut' }, { id: 'laser' }, { id: 'ink' }];
      return Promise.resolve({ items: items as never, meta: { ...params, total: serviceTotal } });
    },
  },
  search,
  customers: {
    findById: (id) => Promise.resolve(id === customerId ? ({ firstName: 'Noor' } as never) : null),
  },
  unread,
  popularity: { rank: () => Promise.resolve(['ink', 'laser']) },
  pastVisits: {
    recent: (who) =>
      Promise.resolve(
        who === customerId
          ? [
              { salonId: 'ink-studio', bookingId: 'b2', salonServiceIds: ['s9'] },
              { salonId: 'glow', bookingId: 'b1', salonServiceIds: ['s1', 's2'] },
            ]
          : [],
      ),
  },
});
const app = createApp({
  logger,
  services: {
    home,
    installations: {
      service: undefined as never,
      customerOptional: optionalAuth('customer', SECRET),
      customerRequired: optionalAuth('customer', SECRET),
      merchantRequired: optionalAuth('merchant', SECRET),
    },
  },
});

interface Section {
  items: { id: string; lastBooking?: unknown }[];
  hasMore: boolean;
}
interface Body {
  data: {
    firstName: string | null;
    unreadCount: number | null;
    banners: { id: string }[];
    explore: Section;
    nearYou: Section | null;
    recommendedAll: Section;
    bookAgain: Section | null;
    services: Section;
    recommended: Section;
    nearest: Section | null;
    salonServices: Section;
    clinicServices: Section;
    recommendedSalons: Section;
    recommendedClinics: Section;
    nearestSalons: Section | null;
    nearestClinics: Section | null;
  };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const token = (): string =>
  `Bearer ${
    signAccessToken({ secret: SECRET, subjectType: 'CUSTOMER', subjectId: customerId, ttlSec: 600 })
      .token
  }`;

beforeEach(() => {
  calls.length = 0;
  catalogCalls.length = 0;
  salonTotal = 3;
  serviceTotal = 2;
});

describe('GET /customer/v1/home (§5.22 merged home)', () => {
  it('gives a guest every section but the bell, Near you and Book again; never a gender filter', async () => {
    const res = await request(app)
      .get('/customer/v1/home?gender=FEMALE')
      .set('Accept-Language', 'en');
    expect(res.status).toBe(200);
    const d = bodyOf(res).data;
    expect(d.firstName).toBeNull();
    expect(d.unreadCount).toBeNull();
    expect(d.banners).toEqual([{ id: 'FEMALE-en' }]);
    expect([d.nearYou, d.bookAgain, d.nearest]).toEqual([null, null, null]);
    expect(d.recommendedAll.items[0]?.id).toBe('RECOMMENDED:');
    expect(calls.map((c) => c.query)).toEqual([
      { businessTypes: undefined, general: 'RECOMMENDED' },
      { businessTypes: ['SALON'], general: 'RECOMMENDED' },
      { businessTypes: ['CLINIC'], general: 'RECOMMENDED' },
    ]);
    expect(calls.some((c) => 'gender' in c.query)).toBe(false);
  });

  it('Explore puts the most-booked services first, then the admin order', async () => {
    const d = bodyOf(await request(app).get('/customer/v1/home?gender=MALE')).data;
    expect(d.explore.items.map((i) => i.id)).toEqual(['ink', 'laser', 'cut']);
    expect(catalogCalls[0]).toEqual({ businessType: undefined, pageSize: 50 });
  });

  it('the lens filters Explore, Near you, Recommended and Book again at once', async () => {
    const res = await request(app)
      .get('/customer/v1/home?gender=MALE&lat=31.95&lng=35.93&businessType=TATTOO,CLINIC')
      .set('Authorization', token());
    const d = bodyOf(res).data;
    expect(catalogCalls[0]).toEqual({ businessType: ['TATTOO', 'CLINIC'], pageSize: 50 });
    expect(d.recommendedAll.items[0]?.id).toBe('RECOMMENDED:TATTOO+CLINIC');
    expect(d.nearYou?.items[0]?.id).toBe('nearest:TATTOO+CLINIC');
    expect(d.bookAgain?.items.map((i) => i.id)).toEqual(['ink-studio']);
  });

  it('adds name, unread count and Book again (latest booking services) for a signed-in customer', async () => {
    const res = await request(app)
      .get('/customer/v1/home?gender=MALE')
      .set('Authorization', token());
    const d = bodyOf(res).data;
    expect(d).toMatchObject({ firstName: 'Noor', unreadCount: 120 });
    expect(d.bookAgain?.items).toEqual([
      expect.objectContaining({
        id: 'ink-studio',
        lastBooking: { id: 'b2', salonServiceIds: ['s9'] },
      }),
      expect.objectContaining({
        id: 'glow',
        lastBooking: { id: 'b1', salonServiceIds: ['s1', 's2'] },
      }),
    ]);
    expect(calls[0]?.customerId).toBe(customerId);
  });

  it('keeps the per-type keys for older apps (no gender filter), old aliases = the salon ones', async () => {
    const res = await request(app).get('/customer/v1/home?gender=MALE&lat=31.95&lng=35.93');
    const d = bodyOf(res).data;
    expect(d.salonServices.items[0]?.id).toBe('SALON');
    expect(d.clinicServices.items[0]?.id).toBe('CLINIC');
    expect(d.recommendedSalons.items[0]?.id).toBe('RECOMMENDED:SALON');
    expect(d.recommendedClinics.items[0]?.id).toBe('RECOMMENDED:CLINIC');
    expect(d.nearestSalons?.items[0]?.id).toBe('nearest:SALON');
    expect(d.nearestClinics?.items[0]?.id).toBe('nearest:CLINIC');
    expect(d.services).toEqual(d.salonServices);
    expect(d.recommended).toEqual(d.recommendedSalons);
    expect(d.nearest).toEqual(d.nearestSalons);
    const nearest = calls.filter((c) => c.query['sort'] === 'NEAREST').map((c) => c.query);
    expect(nearest).toEqual([
      { businessTypes: undefined, lat: 31.95, lng: 35.93, sort: 'NEAREST' },
      { businessTypes: ['SALON'], lat: 31.95, lng: 35.93, sort: 'NEAREST' },
      { businessTypes: ['CLINIC'], lat: 31.95, lng: 35.93, sort: 'NEAREST' },
    ]);
  });

  it('flags See more only when a section holds more than its page', async () => {
    salonTotal = HOME_SECTION_SIZE;
    serviceTotal = HOME_SECTION_SIZE + 1;
    const d = bodyOf(await request(app).get('/customer/v1/home?gender=FEMALE&lat=1&lng=1')).data;
    expect(d.services.hasMore).toBe(true);
    expect(d.explore.hasMore).toBe(true);
    expect(d.recommendedAll.hasMore).toBe(false);
    expect(d.nearYou?.hasMore).toBe(false);
    salonTotal = HOME_SECTION_SIZE + 1;
    expect(
      bodyOf(await request(app).get('/customer/v1/home?gender=FEMALE')).data.recommendedAll.hasMore,
    ).toBe(true);
  });

  it.each([
    ['no gender', ''],
    ['an unknown gender', 'gender=ANY'],
    ['an unknown business type', 'gender=MALE&businessType=SPA'],
    ['lat without lng', 'gender=MALE&lat=1'],
    ['an out-of-range latitude', 'gender=MALE&lat=95&lng=1'],
  ])('rejects %s', async (_n, query) => {
    expect((await request(app).get(`/customer/v1/home?${query}`)).status).toBe(400);
  });

  it('refuses a bad bearer token', async () => {
    const res = await request(app)
      .get('/customer/v1/home?gender=MALE')
      .set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });
});
