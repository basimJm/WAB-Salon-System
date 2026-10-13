import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createInboxService } from '../src/domain/notifications/inbox.service';
import { requireAuth } from '../src/middlewares/auth';
import { NotificationsRepository } from '../src/repositories/notifications.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T08:00:00Z');
const fake = createFakeModel();
const repo = new NotificationsRepository(fake.model as never);
const pushed: { id: string; count: number }[] = [];
const service = createInboxService({
  notifications: repo,
  settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
  access: {
    unreadChanged: (account, count) => {
      pushed.push({ id: account.id, count });
      return Promise.resolve();
    },
  },
  now: () => NOW,
});
const guard = requireAuth('customer', SECRET);
const app = createApp({
  logger,
  services: {
    inbox: service,
    installations: {
      service: undefined as never,
      customerOptional: guard,
      customerRequired: guard,
      merchantRequired: requireAuth('merchant', SECRET),
    },
  },
});

interface Body {
  data: { id: string; title: string; body: string; isRead: boolean }[] & {
    unread: number;
    marked: number;
  };
  meta?: { total: number };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const me = new Types.ObjectId();
const other = new Types.ObjectId();
const auth = (id = me.toHexString()): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'CUSTOMER', subjectId: id, ttlSec: 600 }).token}`;
const add = (
  recipientId: Types.ObjectId,
  at: string,
  title: string,
  extra: Record<string, unknown> = {},
): Types.ObjectId => {
  const _id = new Types.ObjectId();
  fake.docs.push({
    _id,
    recipientType: 'CUSTOMER',
    recipientId,
    type: 'BOOKING',
    event: 'booking.approved',
    title: { ar: `ع ${title}`, en: title },
    body: { ar: `نص ${title}`, en: `body ${title}` },
    data: {},
    pushSent: false,
    createdAt: new Date(at),
    ...extra,
  });
  return _id;
};

let first: Types.ObjectId;
let second: Types.ObjectId;
beforeEach(() => {
  fake.docs.length = 0;
  pushed.length = 0;
  first = add(me, '2026-10-10T10:00:00Z', 'Alpha');
  second = add(me, '2026-10-11T10:00:00Z', 'Beta (x)', {
    readAt: new Date('2026-10-11T11:00:00Z'),
  });
  add(other, '2026-10-11T12:00:00Z', 'Foreign');
});

describe('notification inbox', () => {
  it('needs a customer token', async () => {
    expect((await request(app).get('/customer/v1/notifications')).status).toBe(401);
  });

  it('lists only my notifications, newest first, in the request language', async () => {
    const res = await request(app)
      .get('/customer/v1/notifications')
      .set('Authorization', auth())
      .set('Accept-Language', 'en');
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.map((n) => n.title)).toEqual(['Beta (x)', 'Alpha']);
    expect(bodyOf(res).data.map((n) => n.isRead)).toEqual([true, false]);
    expect(bodyOf(res).meta?.total).toBe(2);
    const ar = await request(app).get('/customer/v1/notifications').set('Authorization', auth());
    expect(bodyOf(ar).data[0]?.title).toBe('ع Beta (x)');
  });

  it('paginates', async () => {
    const res = await request(app)
      .get('/customer/v1/notifications?page=2&pageSize=1')
      .set('Authorization', auth());
    expect(bodyOf(res).data).toHaveLength(1);
    expect(bodyOf(res).meta?.total).toBe(2);
  });

  it('filters by Amman date range, unread and text (special characters are literal)', async () => {
    const day = await request(app)
      .get('/customer/v1/notifications?from=2026-10-11&to=2026-10-11')
      .set('Authorization', auth())
      .set('Accept-Language', 'en');
    expect(bodyOf(day).data.map((n) => n.title)).toEqual(['Beta (x)']);
    const unread = await request(app)
      .get('/customer/v1/notifications?unreadOnly=true')
      .set('Authorization', auth())
      .set('Accept-Language', 'en');
    expect(bodyOf(unread).data.map((n) => n.title)).toEqual(['Alpha']);
    const text = await request(app)
      .get('/customer/v1/notifications?q=(x)')
      .set('Authorization', auth())
      .set('Accept-Language', 'en');
    expect(bodyOf(text).data.map((n) => n.title)).toEqual(['Beta (x)']);
  });

  it('treats the day as an Amman day (21:00Z starts the next day)', async () => {
    add(me, '2026-10-11T21:30:00Z', 'Late');
    const res = await request(app)
      .get('/customer/v1/notifications?from=2026-10-12&to=2026-10-12')
      .set('Authorization', auth())
      .set('Accept-Language', 'en');
    expect(bodyOf(res).data.map((n) => n.title)).toEqual(['Late']);
  });

  it('rejects bad input', async () => {
    for (const query of ['from=2026-02-30', 'from=2026-10-12&to=2026-10-01', 'pageSize=0']) {
      const res = await request(app)
        .get(`/customer/v1/notifications?${query}`)
        .set('Authorization', auth());
      expect(res.status).toBe(400);
    }
  });

  it('counts unread', async () => {
    const res = await request(app)
      .get('/customer/v1/notifications/unread-count')
      .set('Authorization', auth());
    expect(bodyOf(res).data.unread).toBe(1);
  });

  it('marks own notifications read once, ignores foreign and repeated ids, pushes the badge', async () => {
    const foreign = fake.docs.find((d) => d['recipientId'] === other)?.['_id'] as Types.ObjectId;
    const res = await request(app)
      .post('/customer/v1/notifications/read')
      .set('Authorization', auth())
      .send({ ids: [first.toHexString(), foreign.toHexString(), second.toHexString()] });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.marked).toBe(1);
    expect(bodyOf(res).data.unread).toBe(0);
    expect(pushed).toEqual([{ id: me.toHexString(), count: 0 }]);
    expect(fake.docs.find((d) => d['_id'] === foreign)?.['readAt']).toBeUndefined();
    const again = await request(app)
      .post('/customer/v1/notifications/read')
      .set('Authorization', auth())
      .send({ ids: [first.toHexString()] });
    expect(bodyOf(again).data.marked).toBe(0);
    expect(pushed).toHaveLength(1);
  });

  it('validates the read body', async () => {
    for (const body of [
      {},
      { ids: [] },
      { ids: ['nope'] },
      { ids: Array(51).fill(first.toHexString()) },
    ]) {
      const res = await request(app)
        .post('/customer/v1/notifications/read')
        .set('Authorization', auth())
        .send(body);
      expect(res.status).toBe(400);
    }
  });

  it('answers 503 for the merchant app when no service is configured', async () => {
    const bare = createApp({ logger });
    const res = await request(bare).get('/merchant/v1/notifications');
    expect([401, 503]).toContain(res.status);
  });
});
