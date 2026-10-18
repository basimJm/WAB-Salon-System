import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createReviewsService } from '../src/domain/reviews/reviews.service';
import { requireAuth } from '../src/middlewares/auth';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { ReviewsRepository } from '../src/repositories/reviews.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const m = {
  reviews: createFakeModel(),
  salons: createFakeModel(),
  members: createFakeModel(),
  customers: createFakeModel(),
};
let maxPending = 1;
const app = createApp({
  logger,
  services: {
    reviews: createReviewsService({
      reviews: new ReviewsRepository(m.reviews.model as never),
      salons: new SalonsRepository(m.salons.model as never),
      members: new MembersRepository(m.members.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      settings: {
        get: ((key: string) =>
          Promise.resolve(
            key === 'reviews.maxPendingPerTargetPerCustomer'
              ? maxPending
              : SETTING_DEFAULTS[key as never],
          )) as never,
      },
    }),
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
    id: string;
    status: string;
    items: { customerName: string; rating: number; comment: string | null }[];
    summary: { avg: number; count: number };
  };
  meta?: { total: number };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const id = (): Types.ObjectId => new Types.ObjectId();
const auth = (subjectId: string): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'CUSTOMER', subjectId, ttlSec: 600 }).token}`;
const salonId = id();
const staffId = id();
const me = id();

const addCustomer = (_id: Types.ObjectId, over: Record<string, unknown> = {}): void => {
  m.customers.docs.push({ _id, firstName: 'Noor', lastName: 'Hidden', status: 'ACTIVE', ...over });
};
const post = (path: string, body: object, token = auth(me.toHexString())): request.Test =>
  request(app).post(`/customer/v1/salons/${path}`).set('Authorization', token).send(body);

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  maxPending = 1;
  addCustomer(me);
  m.salons.docs.push({
    _id: salonId,
    state: 'LIVE',
    completeness: { missing: [], isComplete: true },
    rating: { avg: 4.5, count: 2 },
  });
  m.members.docs.push({
    _id: staffId,
    salonId,
    active: true,
    providesServices: true,
    staff: { rating: { avg: 3, count: 1 } },
  });
});

describe('submitting reviews', () => {
  it('stores a salon review as PENDING without needing a booking', async () => {
    const res = await post(`${salonId.toHexString()}/reviews`, { rating: 5, comment: ' Great ' });
    expect(res.status).toBe(201);
    expect(bodyOf(res).data.status).toBe('PENDING');
    expect(m.reviews.docs).toHaveLength(1);
    expect(m.reviews.docs[0]).toMatchObject({ target: 'SALON', rating: 5, comment: 'Great' });
    expect(m.reviews.docs[0]?.['staffId']).toBeUndefined();
  });

  it('stores a staff review independently of the salon review', async () => {
    const salon = salonId.toHexString();
    expect((await post(`${salon}/reviews`, { rating: 4 })).status).toBe(201);
    const res = await post(`${salon}/staff/${staffId.toHexString()}/reviews`, { rating: 2 });
    expect(res.status).toBe(201);
    expect(m.reviews.docs.map((d) => d['target'])).toEqual(['SALON', 'STAFF']);
  });

  it('limits pending reviews per target and customer, but not across targets or customers', async () => {
    const path = `${salonId.toHexString()}/reviews`;
    expect((await post(path, { rating: 5 })).status).toBe(201);
    const again = await post(path, { rating: 1 });
    expect(again.status).toBe(429);
    expect(bodyOf(again).error.code).toBe('RATE_LIMITED');
    const other = id();
    addCustomer(other);
    expect((await post(path, { rating: 3 }, auth(other.toHexString()))).status).toBe(201);
    expect(
      (await post(`${salonId.toHexString()}/staff/${staffId.toHexString()}/reviews`, { rating: 3 }))
        .status,
    ).toBe(201);
    maxPending = 2;
    expect((await post(path, { rating: 2 })).status).toBe(201);
  });

  it('a decided review frees the slot', async () => {
    const path = `${salonId.toHexString()}/reviews`;
    await post(path, { rating: 5 });
    for (const doc of m.reviews.docs) doc['status'] = 'APPROVED';
    expect((await post(path, { rating: 4 })).status).toBe(201);
  });

  it.each([
    ['rating 0', { rating: 0 }],
    ['rating 6', { rating: 6 }],
    ['a fractional rating', { rating: 4.5 }],
    ['no rating', {}],
    ['a long comment', { rating: 3, comment: 'x'.repeat(1001) }],
  ])('rejects %s', async (_n, body) => {
    expect((await post(`${salonId.toHexString()}/reviews`, body)).status).toBe(400);
    expect(m.reviews.docs).toHaveLength(0);
  });

  it('refuses hidden salons, foreign or inactive staff and blocked customers', async () => {
    const path = `${salonId.toHexString()}/reviews`;
    const foreign = id();
    m.members.docs.push({
      _id: foreign,
      salonId: id(),
      active: true,
      providesServices: true,
      staff: { rating: { avg: 0, count: 0 } },
    });
    const gone = id();
    m.members.docs.push({
      _id: gone,
      salonId,
      active: false,
      providesServices: true,
      staff: { rating: { avg: 0, count: 0 } },
    });
    for (const member of [foreign, gone, id()]) {
      expect(
        (
          await post(`${salonId.toHexString()}/staff/${member.toHexString()}/reviews`, {
            rating: 3,
          })
        ).status,
      ).toBe(404);
    }
    expect((await post(`${id().toHexString()}/reviews`, { rating: 3 })).status).toBe(404);
    const blocked = id();
    addCustomer(blocked, { status: 'BLOCKED' });
    const res = await post(path, { rating: 3 }, auth(blocked.toHexString()));
    expect(res.status).toBe(403);
    expect(bodyOf(res).error.code).toBe('ACCOUNT_BLOCKED');
    for (const doc of m.salons.docs) doc['state'] = 'OFFLINE';
    expect((await post(path, { rating: 3 })).status).toBe(404);
    expect(m.reviews.docs).toHaveLength(0);
  });

  it('needs a customer token', async () => {
    const res = await request(app)
      .post(`/customer/v1/salons/${salonId.toHexString()}/reviews`)
      .send({ rating: 5 });
    expect(res.status).toBe(401);
  });
});

describe('listing reviews', () => {
  const add = (over: Record<string, unknown>): void => {
    m.reviews.docs.push({
      _id: id(),
      target: 'SALON',
      salonId,
      customerId: me,
      rating: 5,
      status: 'APPROVED',
      createdAt: new Date(),
      ...over,
    });
  };

  it('shows only approved reviews of that target, newest first, first name only, with the summary', async () => {
    add({ rating: 5, comment: 'old', createdAt: new Date('2026-01-01') });
    add({ rating: 3, comment: 'new', createdAt: new Date('2026-02-01') });
    add({ rating: 1, status: 'PENDING' });
    add({ rating: 1, status: 'REJECTED' });
    add({ rating: 1, status: 'REMOVED' });
    add({ target: 'STAFF', staffId, rating: 2 });
    add({ salonId: id(), rating: 1 });
    const res = await request(app).get(`/customer/v1/salons/${salonId.toHexString()}/reviews`);
    expect(res.status).toBe(200);
    const d = bodyOf(res).data;
    expect(d.items.map((r) => r.comment)).toEqual(['new', 'old']);
    expect(d.items[0]?.customerName).toBe('Noor');
    expect(JSON.stringify(res.body)).not.toContain('Hidden');
    expect(d.summary).toEqual({ avg: 4.5, count: 2 });
    expect(bodyOf(res).meta?.total).toBe(2);
  });

  it('lists staff reviews with the staff rating, paginated by 10', async () => {
    for (let i = 0; i < 12; i += 1) add({ target: 'STAFF', staffId, rating: 4 });
    add({ target: 'STAFF', staffId: id(), rating: 1 });
    const path = `/customer/v1/salons/${salonId.toHexString()}/staff/${staffId.toHexString()}/reviews`;
    const first = bodyOf(await request(app).get(path));
    expect(first.data.items).toHaveLength(10);
    expect(first.meta?.total).toBe(12);
    expect(first.data.summary).toEqual({ avg: 3, count: 1 });
    expect(bodyOf(await request(app).get(`${path}?page=2`)).data.items).toHaveLength(2);
  });

  it('404s for hidden salons and unknown staff, 400s for bad ids', async () => {
    for (const doc of m.salons.docs) doc['state'] = 'OFFLINE';
    expect(
      (await request(app).get(`/customer/v1/salons/${salonId.toHexString()}/reviews`)).status,
    ).toBe(404);
    for (const doc of m.salons.docs) doc['state'] = 'LIVE';
    expect(
      (
        await request(app).get(
          `/customer/v1/salons/${salonId.toHexString()}/staff/${id().toHexString()}/reviews`,
        )
      ).status,
    ).toBe(404);
    expect((await request(app).get('/customer/v1/salons/nope/reviews')).status).toBe(400);
  });
});
