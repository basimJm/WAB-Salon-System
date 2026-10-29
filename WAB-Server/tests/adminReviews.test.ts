import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createAdminReviewsService } from '../src/domain/reviews/adminReviews.service';
import { requireAuth } from '../src/middlewares/auth';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { ReviewsRepository } from '../src/repositories/reviews.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const adminId = new Types.ObjectId();
const m = {
  reviews: createFakeModel(),
  salons: createFakeModel(),
  members: createFakeModel(),
  customers: createFakeModel(),
};
const audits: Record<string, unknown>[] = [];
const reviewsService = createAdminReviewsService({
  reviews: new ReviewsRepository(m.reviews.model as never),
  salons: new SalonsRepository(m.salons.model as never),
  members: new MembersRepository(m.members.model as never),
  customers: new CustomersRepository(m.customers.model as never),
  audit: createAuditWriter({
    append: (data) => {
      audits.push(data);
      return Promise.resolve({ id: 'a', ...data } as never);
    },
  }),
  logger,
});
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminReviews: reviewsService,
  },
});

interface Row {
  id: string;
  status: string;
  authorOtherReviews: number;
  salon: { name: string };
  staff: { firstName: string } | null;
  author: { firstName: string };
  moderation: { reason: string | null } | null;
}
interface Body {
  data: Row & Row[] & { id: string; ok: boolean; code?: string }[];
  meta?: { total: number };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const token = (): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: adminId.toHexString(), ttlSec: 600 }).token}`;
const id = (): Types.ObjectId => new Types.ObjectId();
const salonId = id();
const staffId = id();
const author = id();
const base = '/admin/v1/reviews';
const post = (path: string, body: object): request.Test =>
  request(app).post(`${base}${path}`).set('Authorization', token()).send(body);

const addReview = (over: Record<string, unknown> = {}): string => {
  const _id = id();
  m.reviews.docs.push({
    _id,
    target: 'SALON',
    salonId,
    customerId: author,
    rating: 5,
    status: 'PENDING',
    createdAt: new Date(2026, 0, m.reviews.docs.length + 1),
    ...over,
  });
  return _id.toHexString();
};
const salon = (): Record<string, unknown> | undefined => m.salons.docs[0];
const staffRating = (): unknown =>
  (m.members.docs[0]?.['staff'] as { rating: unknown } | undefined)?.rating;

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  audits.length = 0;
  m.salons.docs.push({
    _id: salonId,
    name: 'Glow',
    businessType: 'SALON',
    audience: 'FEMALE',
    rating: { avg: 0, count: 0 },
  });
  m.members.docs.push({
    _id: staffId,
    salonId,
    firstName: 'Lina',
    staff: { rating: { avg: 0, count: 0 } },
  });
  m.customers.docs.push({ _id: author, firstName: 'Noor', lastName: 'K' });
});

describe('GET /admin/v1/reviews', () => {
  it('lists the pending queue oldest first with author, target and the author’s other reviews', async () => {
    const first = addReview({ comment: 'one' });
    addReview({ target: 'STAFF', staffId, comment: 'two' });
    addReview({ status: 'APPROVED' });
    const res = await request(app).get(base).set('Authorization', token());
    expect(res.status).toBe(200);
    const rows = bodyOf(res).data as Row[];
    expect(rows.map((r) => r.id)[0]).toBe(first);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ salon: { name: 'Glow' }, author: { firstName: 'Noor' } });
    expect(rows[0]?.authorOtherReviews).toBe(2);
    expect(rows[1]?.staff).toEqual({ id: staffId.toHexString(), firstName: 'Lina' });
  });

  it('filters by status, target, rating and salon', async () => {
    addReview({ status: 'APPROVED', rating: 2 });
    addReview({ status: 'APPROVED', rating: 4, target: 'STAFF', staffId });
    const get = async (q: string): Promise<number> =>
      (bodyOf(await request(app).get(`${base}?${q}`).set('Authorization', token())).data as Row[])
        .length;
    expect(await get('status=APPROVED')).toBe(2);
    expect(await get('status=APPROVED&target=STAFF')).toBe(1);
    expect(await get('status=APPROVED&rating=2')).toBe(1);
    expect(await get(`status=APPROVED&salonId=${id().toHexString()}`)).toBe(0);
    // §5.19: reviews of salons or of clinics.
    expect(await get('status=APPROVED&businessType=SALON')).toBe(2);
    expect(await get('status=APPROVED&businessType=CLINIC')).toBe(0);
    expect(await get(`status=APPROVED&businessType=SALON&salonId=${salonId.toHexString()}`)).toBe(
      2,
    );
    expect((await request(app).get(`${base}?rating=9`).set('Authorization', token())).status).toBe(
      400,
    );
  });

  it('needs an admin token', async () => {
    expect((await request(app).get(base)).status).toBe(401);
    const customerToken = signAccessToken({
      secret: SECRET,
      subjectType: 'CUSTOMER',
      subjectId: id().toHexString(),
      ttlSec: 600,
    }).token;
    expect(
      (await request(app).get(base).set('Authorization', `Bearer ${customerToken}`)).status,
    ).toBe(403);
  });
});

describe('deciding', () => {
  it('approve publishes and recomputes the salon rating (1 decimal), audited with a default reason', async () => {
    const a = addReview({ rating: 5 });
    addReview({ rating: 4, status: 'APPROVED' });
    addReview({ rating: 4, status: 'APPROVED' });
    addReview({ rating: 1, status: 'REJECTED' });
    const res = await post(`/${a}/approve`, {});
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.status).toBe('APPROVED');
    expect(salon()?.['rating']).toEqual({ avg: 4.3, count: 3 });
    expect(audits[0]).toMatchObject({
      action: 'REVIEW_APPROVE',
      entityType: 'review',
      entityId: a,
    });
    expect(audits[0]?.['reason']).toBeTruthy();
  });

  it('a staff review changes only the staff rating', async () => {
    const a = addReview({ target: 'STAFF', staffId, rating: 3 });
    await post(`/${a}/approve`, { reason: 'ok' });
    expect(staffRating()).toEqual({ avg: 3, count: 1 });
    expect(salon()?.['rating']).toEqual({ avg: 0, count: 0 });
  });

  it('reject keeps ratings unchanged and stores the reason', async () => {
    const a = addReview();
    const res = await post(`/${a}/reject`, { reason: 'spam' });
    expect(bodyOf(res).data.status).toBe('REJECTED');
    expect(bodyOf(res).data.moderation?.reason).toBe('spam');
    expect(salon()?.['rating']).toEqual({ avg: 0, count: 0 });
    expect(audits[0]).toMatchObject({ action: 'REVIEW_REJECT', reason: 'spam' });
  });

  it('a review is decided only once, unknown ids are 404', async () => {
    const a = addReview();
    await post(`/${a}/approve`, {});
    for (const path of ['approve', 'reject']) {
      const again = await post(`/${a}/${path}`, {});
      expect(again.status).toBe(422);
      expect(bodyOf(again).error.code).toBe('ALREADY_HANDLED');
    }
    expect((await post(`/${id().toHexString()}/approve`, {})).status).toBe(404);
    expect((await post('/nope/approve', {})).status).toBe(400);
    expect(audits).toHaveLength(1);
  });
});

describe('removing a published review', () => {
  it('needs a reason, takes it down and lowers the rating (to 0 when none is left)', async () => {
    const a = addReview({ status: 'APPROVED', rating: 4 });
    for (const doc of m.salons.docs) doc['rating'] = { avg: 4, count: 1 };
    expect((await post(`/${a}/remove`, {})).status).toBe(400);
    const res = await post(`/${a}/remove`, { reason: 'abusive' });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.status).toBe('REMOVED');
    expect(salon()?.['rating']).toEqual({ avg: 0, count: 0 });
    expect(audits[0]).toMatchObject({ action: 'REVIEW_REMOVE', reason: 'abusive' });
  });

  it('only published reviews can be removed', async () => {
    const pending = addReview();
    const res = await post(`/${pending}/remove`, { reason: 'x' });
    expect(res.status).toBe(422);
  });
});

describe('bulk decisions', () => {
  it('decides each review, reports the ones already handled and recomputes once per decision', async () => {
    const a = addReview({ rating: 5 });
    const b = addReview({ rating: 3 });
    const done = addReview({ status: 'APPROVED', rating: 1 });
    const res = await post('/bulk', {
      ids: [a, b, done, id().toHexString(), a],
      decision: 'approve',
    });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toEqual([
      { id: a, ok: true },
      { id: b, ok: true },
      { id: done, ok: false, code: 'ALREADY_HANDLED' },
      expect.objectContaining({ ok: false, code: 'NOT_FOUND' }),
    ]);
    expect(salon()?.['rating']).toEqual({ avg: 3, count: 3 });
    expect(audits).toHaveLength(2);
  });

  it.each([
    ['no ids', { ids: [], decision: 'approve' }],
    ['a bad id', { ids: ['x'], decision: 'approve' }],
    ['an unknown decision', { ids: [new Types.ObjectId().toHexString()], decision: 'remove' }],
    [
      'more than 100 ids',
      {
        ids: Array.from({ length: 101 }, () => new Types.ObjectId().toHexString()),
        decision: 'reject',
      },
    ],
  ])('rejects %s', async (_n, body) => {
    expect((await post('/bulk', body)).status).toBe(400);
  });
});

describe('service list by author', () => {
  it('lists every review of one customer whatever its status, newest first, and no one else’s', async () => {
    const other = id();
    const first = addReview({ status: 'APPROVED', createdAt: new Date('2026-10-01T00:00:00Z') });
    const second = addReview({ status: 'REJECTED', createdAt: new Date('2026-10-02T00:00:00Z') });
    const pending = addReview({ status: 'PENDING', createdAt: new Date('2026-10-03T00:00:00Z') });
    addReview({ customerId: other, status: 'APPROVED' });
    const result = await reviewsService.list({
      authorId: author.toHexString(),
      params: { page: 1, pageSize: 10 },
    });
    expect(result.total).toBe(3);
    expect(result.items.map((r) => r.id)).toEqual([pending, second, first]);
    const approvedOnly = await reviewsService.list({
      authorId: author.toHexString(),
      status: 'APPROVED',
      params: { page: 1, pageSize: 10 },
    });
    expect(approvedOnly.items.map((r) => r.id)).toEqual([first]);
  });
});
