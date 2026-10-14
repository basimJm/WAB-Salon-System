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
let salonTotal = 3;
const cardOf = (name: string): object => ({ id: name, name });
const search: Pick<SearchService, 'search'> = {
  search: ({ query, params, customerId: who }) => {
    calls.push({ query: { ...query }, customerId: who });
    return Promise.resolve({
      items: [cardOf(query.general ?? 'nearest')] as never,
      meta: { ...params, total: salonTotal },
    });
  },
};
let serviceTotal = 2;
const unread: UnreadLookup = { count: () => Promise.resolve(120) };
const home = createHomeService({
  banners: {
    live: (gender, language) => Promise.resolve([{ id: `${gender}-${language}` }] as never),
  },
  catalog: {
    list: ({ params }) =>
      Promise.resolve({ items: [{ id: 's1' }] as never, meta: { ...params, total: serviceTotal } }),
  },
  search,
  customers: {
    findById: (id) => Promise.resolve(id === customerId ? ({ firstName: 'Noor' } as never) : null),
  },
  unread,
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

interface Body {
  data: {
    firstName: string | null;
    unreadCount: number | null;
    banners: { id: string }[];
    services: { items: unknown[]; hasMore: boolean };
    recommended: { items: unknown[]; hasMore: boolean };
    nearest: { items: unknown[]; hasMore: boolean } | null;
  };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;

beforeEach(() => {
  calls.length = 0;
  salonTotal = 3;
  serviceTotal = 2;
});

describe('GET /customer/v1/home', () => {
  it('gives a guest every section but the bell and the nearest list', async () => {
    const res = await request(app)
      .get('/customer/v1/home?gender=FEMALE')
      .set('Accept-Language', 'en');
    expect(res.status).toBe(200);
    const d = bodyOf(res).data;
    expect(d.firstName).toBeNull();
    expect(d.unreadCount).toBeNull();
    expect(d.banners).toEqual([{ id: 'FEMALE-en' }]);
    expect(d.services.items).toHaveLength(1);
    expect(d.recommended.items).toHaveLength(1);
    expect(d.nearest).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.query).toEqual({ gender: 'FEMALE', general: 'RECOMMENDED' });
  });

  it('adds name, unread count and favorites for a signed-in customer', async () => {
    const token = signAccessToken({
      secret: SECRET,
      subjectType: 'CUSTOMER',
      subjectId: customerId,
      ttlSec: 600,
    }).token;
    const res = await request(app)
      .get('/customer/v1/home?gender=MALE')
      .set('Authorization', `Bearer ${token}`);
    expect(bodyOf(res).data).toMatchObject({ firstName: 'Noor', unreadCount: 120 });
    expect(calls[0]?.customerId).toBe(customerId);
  });

  it('adds the nearest section when a position is sent', async () => {
    const res = await request(app).get('/customer/v1/home?gender=FEMALE&lat=31.95&lng=35.93');
    expect(bodyOf(res).data.nearest?.items).toHaveLength(1);
    expect(calls[1]?.query).toEqual({ gender: 'FEMALE', lat: 31.95, lng: 35.93, sort: 'NEAREST' });
  });

  it('flags See more only when a section holds more than its page', async () => {
    salonTotal = HOME_SECTION_SIZE;
    serviceTotal = HOME_SECTION_SIZE + 1;
    const d = bodyOf(await request(app).get('/customer/v1/home?gender=FEMALE&lat=1&lng=1')).data;
    expect(d.services.hasMore).toBe(true);
    expect(d.recommended.hasMore).toBe(false);
    expect(d.nearest?.hasMore).toBe(false);
    salonTotal = HOME_SECTION_SIZE + 1;
    expect(
      bodyOf(await request(app).get('/customer/v1/home?gender=FEMALE')).data.recommended.hasMore,
    ).toBe(true);
  });

  it.each([
    ['no gender', ''],
    ['an unknown gender', 'gender=ANY'],
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
