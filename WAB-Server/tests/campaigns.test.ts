import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createCampaignsService } from '../src/domain/campaigns/campaigns.service';
import { createNotificationService } from '../src/domain/notifications/notifications.service';
import type { DelayedJob } from '../src/jobs/jobs';
import { FakeNotifier } from '../src/providers/notifier/fake';
import { CampaignsRepository } from '../src/repositories/campaigns.repository';
import {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
} from '../src/repositories/identity.repository';
import { NotificationsRepository } from '../src/repositories/notifications.repository';
import { requireAuth } from '../src/middlewares/auth';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T08:00:00Z');
const m = {
  campaigns: createFakeModel(),
  customers: createFakeModel(),
  members: createFakeModel(),
  installations: createFakeModel(),
  notifications: createFakeModel(),
  salons: createFakeModel(),
};
const notifier = new FakeNotifier();
const queued = new Map<string, DelayedJob>();
const audits: Record<string, unknown>[] = [];
const notificationsRepo = new NotificationsRepository(m.notifications.model as never);
const notificationService = createNotificationService({
  notifications: notificationsRepo,
  customers: new CustomersRepository(m.customers.model as never),
  members: new MembersRepository(m.members.model as never),
  installations: new InstallationsRepository(m.installations.model as never),
  notifier,
  access: { unreadChanged: () => Promise.resolve() },
  logger,
});
const service = createCampaignsService({
  campaigns: new CampaignsRepository(m.campaigns.model as never),
  customers: new CustomersRepository(m.customers.model as never),
  members: new MembersRepository(m.members.model as never),
  installations: new InstallationsRepository(m.installations.model as never),
  salons: {
    findById: (id: string) =>
      Promise.resolve(id === salon.toHexString() ? ({ id } as never) : null),
  },
  notifications: notificationService,
  notificationsRepository: notificationsRepo,
  notifier,
  scheduler: {
    schedule: (job) => {
      if (queued.has(job.id)) return Promise.resolve(false);
      queued.set(job.id, job);
      return Promise.resolve(true);
    },
    remove: (id) => Promise.resolve(queued.delete(id)),
  },
  audit: {
    record: (entry: Record<string, unknown>) => {
      audits.push(entry);
      return Promise.resolve();
    },
  } as never,
  logger,
  now: () => NOW,
});

const admin = new Types.ObjectId();
const salon = new Types.ObjectId();
const city = new Types.ObjectId();
const actor = { adminId: admin.toHexString(), ip: '1.1.1.1', userAgent: 'ua' };
const customer = (over: Record<string, unknown> = {}): Types.ObjectId => {
  const _id = new Types.ObjectId();
  m.customers.docs.push({
    _id,
    status: 'ACTIVE',
    gender: 'FEMALE',
    cityId: city,
    language: 'en',
    pushEnabled: true,
    ...over,
  });
  return _id;
};
const device = (
  owner: { customerId?: Types.ObjectId; memberId?: Types.ObjectId },
  token: string,
  language = 'en',
  app = 'CUSTOMER',
): void => {
  m.installations.docs.push({
    _id: new Types.ObjectId(),
    app,
    fcmToken: token,
    language,
    platform: 'ANDROID',
    lastSeenAt: new Date(),
    ...owner,
  });
};
const title = { ar: 'عرض', en: 'Offer' };
const body = { ar: 'خصم', en: 'Discount' };
const compose = (
  audience: Record<string, unknown>,
  app: 'CUSTOMER' | 'MERCHANT' = 'CUSTOMER',
  extra: Record<string, unknown> = {},
): Promise<{ id: string }> =>
  service.create({
    data: { title, body, app, audience: audience as never, ...extra },
    reason: 'promo',
    actor,
  });
const pushesTo = (token: string): number =>
  notifier.pushes.filter((p) => 'tokens' in p.target && p.target.tokens.includes(token)).length;

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  queued.clear();
  audits.length = 0;
  notifier.pushes.length = 0;
});

describe('campaign creation', () => {
  it('stores a scheduled campaign, queues one job at its time and audits it', async () => {
    const at = new Date('2026-10-20T10:00:00Z');
    const created = await compose({ kind: 'ALL' }, 'CUSTOMER', {
      scheduledAt: at,
      link: '/salons/x',
    });
    expect(queued.get(`campaign.send.${created.id}`)?.runAt).toEqual(at);
    expect(audits[0]).toMatchObject({ action: 'PUSH_CAMPAIGN_CREATE', reason: 'promo' });
    expect(await service.get(created.id)).toMatchObject({ status: 'SCHEDULED', link: '/salons/x' });
  });
  it('sends now by default', async () => {
    const created = await compose({ kind: 'ALL' });
    expect(queued.get(`campaign.send.${created.id}`)?.runAt).toEqual(NOW);
  });
  it('rejects audiences that do not fit the app, unknown salons and far schedules', async () => {
    await expect(compose({ kind: 'GUESTS' }, 'MERCHANT')).rejects.toThrow();
    await expect(
      compose({ kind: 'SALON_MEMBERS', salonId: new Types.ObjectId().toHexString() }, 'MERCHANT'),
    ).rejects.toThrow();
    await expect(
      compose({ kind: 'ALL' }, 'CUSTOMER', { scheduledAt: new Date('2030-01-01T00:00:00Z') }),
    ).rejects.toThrow();
  });
  it('removes the campaign when the job cannot be queued', async () => {
    const failing = createCampaignsService({
      campaigns: new CampaignsRepository(m.campaigns.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      members: new MembersRepository(m.members.model as never),
      installations: new InstallationsRepository(m.installations.model as never),
      salons: { findById: () => Promise.resolve(null) },
      notifications: notificationService,
      notificationsRepository: notificationsRepo,
      notifier,
      scheduler: {
        schedule: () => Promise.reject(new Error('redis down')),
        remove: () => Promise.resolve(false),
      },
      audit: { record: () => Promise.resolve() } as never,
      logger,
      now: () => NOW,
    });
    await expect(
      failing.create({
        data: { title, body, app: 'CUSTOMER', audience: { kind: 'ALL' } },
        reason: 'r',
        actor,
      }),
    ).rejects.toThrow('redis down');
    expect(m.campaigns.docs[0]?.['status']).toBe('CANCELLED');
  });
});

describe('audience size and delivery', () => {
  it('counts accounts and guest devices per audience', async () => {
    const a = customer();
    customer({ gender: 'MALE' });
    customer({ status: 'BLOCKED' });
    device({ customerId: a }, 'tok-a');
    device({}, 'guest-1');
    device({}, 'guest-2');
    expect(await service.audienceSize({ app: 'CUSTOMER', audience: { kind: 'ALL' } })).toBe(4);
    expect(await service.audienceSize({ app: 'CUSTOMER', audience: { kind: 'GUESTS' } })).toBe(2);
    expect(await service.audienceSize({ app: 'CUSTOMER', audience: { kind: 'REGISTERED' } })).toBe(
      2,
    );
    expect(
      await service.audienceSize({ app: 'CUSTOMER', audience: { kind: 'GENDER', gender: 'MALE' } }),
    ).toBe(1);
    expect(
      await service.audienceSize({
        app: 'CUSTOMER',
        audience: { kind: 'CITY', cityIds: [city.toHexString()] },
      }),
    ).toBe(2);
  });

  it('delivers once to registered customers (list + push) and guests, respecting the push switch', async () => {
    const on = customer({ language: 'ar' });
    const off = customer({ pushEnabled: false });
    customer({ status: 'BLOCKED' });
    device({ customerId: on }, 'tok-on', 'ar');
    device({ customerId: off }, 'tok-off');
    device({}, 'guest-en', 'en');
    const created = await compose({ kind: 'ALL' }, 'CUSTOMER', { link: '/salons/s1' });
    await service.send(created.id);
    await service.send(created.id);
    expect(pushesTo('tok-on')).toBe(1);
    expect(pushesTo('tok-off')).toBe(0);
    expect(pushesTo('guest-en')).toBe(1);
    const toOn = notifier.pushes.find(
      (p) => 'tokens' in p.target && p.target.tokens.includes('tok-on'),
    );
    expect(toOn?.message.title).toBe('عرض');
    expect(toOn?.message.data).toMatchObject({ deepLink: '/salons/s1' });
    // in-app copies: one per active customer, type PROMOTION, none for the blocked one or guests
    expect(m.notifications.docs).toHaveLength(2);
    expect(m.notifications.docs[0]).toMatchObject({
      type: 'PROMOTION',
      event: 'campaign.promotion',
    });
    const done = await service.get(created.id);
    expect(done.status).toBe('SENT');
    expect(done.stats).toMatchObject({ targeted: 3, sent: 2, failed: 0 });
  });

  it('opened counts the read copies', async () => {
    const c = customer();
    device({ customerId: c }, 'tok-c');
    const created = await compose({ kind: 'REGISTERED' });
    await service.send(created.id);
    const first = m.notifications.docs[0];
    if (first === undefined) throw new Error('no notification');
    first['readAt'] = new Date();
    expect((await service.get(created.id)).stats.opened).toBe(1);
  });

  it('targets members of one salon only', async () => {
    const mine = new Types.ObjectId();
    m.members.docs.push({ _id: mine, salonId: salon, active: true });
    m.members.docs.push({ _id: new Types.ObjectId(), salonId: new Types.ObjectId(), active: true });
    m.members.docs.push({ _id: new Types.ObjectId(), salonId: salon, active: false });
    device({ memberId: mine }, 'tok-m', 'ar', 'MERCHANT');
    const created = await compose(
      { kind: 'SALON_MEMBERS', salonId: salon.toHexString() },
      'MERCHANT',
    );
    await service.send(created.id);
    expect(pushesTo('tok-m')).toBe(1);
    expect(m.notifications.docs).toHaveLength(1);
    expect((await service.get(created.id)).stats.targeted).toBe(1);
  });
});

describe('cancel and recovery', () => {
  it('cancels a scheduled campaign, removes its job and never sends it', async () => {
    const c = customer();
    device({ customerId: c }, 'tok-c');
    const created = await compose({ kind: 'ALL' }, 'CUSTOMER', {
      scheduledAt: new Date('2026-10-20T10:00:00Z'),
    });
    const cancelled = await service.cancel({ id: created.id, reason: 'oops', actor });
    expect(cancelled.status).toBe('CANCELLED');
    expect(queued.size).toBe(0);
    await service.send(created.id);
    expect(notifier.pushes).toHaveLength(0);
    await expect(service.cancel({ id: created.id, reason: 'again', actor })).rejects.toThrow();
  });
  it('cannot cancel a campaign that was sent; unknown id is 404', async () => {
    const created = await compose({ kind: 'ALL' });
    await service.send(created.id);
    await expect(service.cancel({ id: created.id, reason: 'late', actor })).rejects.toThrow();
    await expect(service.get(new Types.ObjectId().toHexString())).rejects.toThrow();
  });
  it('reconcile re-queues unfinished campaigns only', async () => {
    const open = await compose({ kind: 'ALL' });
    const sent = await compose({ kind: 'ALL' });
    await service.send(sent.id);
    queued.clear();
    expect(await service.reconcile()).toBe(1);
    expect([...queued.keys()]).toEqual([`campaign.send.${open.id}`]);
  });
});

describe('admin API', () => {
  const guard = requireAuth('admin', SECRET);
  const app = createApp({ logger, services: { adminCampaigns: service, adminGuard: guard } });
  const token = (): string =>
    `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: admin.toHexString(), ttlSec: 600 }).token}`;
  it('needs an admin token and a reason; validates the audience shape', async () => {
    expect((await request(app).get('/admin/v1/campaigns')).status).toBe(401);
    const bad = await request(app)
      .post('/admin/v1/campaigns')
      .set('Authorization', token())
      .send({ title, body, app: 'CUSTOMER', audience: { kind: 'GENDER' }, reason: 'x' });
    expect(bad.status).toBe(400);
    const noReason = await request(app)
      .post('/admin/v1/campaigns')
      .set('Authorization', token())
      .send({ title, body, app: 'CUSTOMER', audience: { kind: 'ALL' } });
    expect(noReason.status).toBe(400);
    const ok = await request(app)
      .post('/admin/v1/campaigns')
      .set('Authorization', token())
      .send({ title, body, app: 'CUSTOMER', audience: { kind: 'ALL' }, reason: 'promo' });
    expect(ok.status).toBe(201);
    const list = await request(app).get('/admin/v1/campaigns').set('Authorization', token());
    expect((list.body as { meta: { total: number } }).meta.total).toBe(1);
    const size = await request(app)
      .post('/admin/v1/campaigns/audience-size')
      .set('Authorization', token())
      .send({ app: 'CUSTOMER', audience: { kind: 'ALL' } });
    expect(size.status).toBe(200);
  });
});
