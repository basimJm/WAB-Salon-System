import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import {
  createSalonReviewService,
  type ApplicationNotifier,
} from '../src/domain/salons/salonReview.service';
import { requireAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { SubscriptionsRepository } from '../src/repositories/subscriptions.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T10:00:00.000Z');
const adminId = new Types.ObjectId().toHexString();

const salons = createFakeModel();
const members = createFakeModel();
const subs = createFakeModel();
const audits: Record<string, unknown>[] = [];
const notified: Record<string, unknown>[] = [];
const complete = { value: false };
const notifier: { fail: boolean } & ApplicationNotifier = {
  fail: false,
  reviewed(input) {
    notified.push(input);
    return this.fail ? Promise.reject(new Error('push down')) : Promise.resolve();
  },
};
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminApplications: createSalonReviewService({
      salons: new SalonsRepository(salons.model as never),
      members: new MembersRepository(members.model as never),
      subscriptions: new SubscriptionsRepository(subs.model as never),
      settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
      storage: new FakeStorageProvider(),
      audit: createAuditWriter({
        append: (data) => {
          audits.push(data);
          return Promise.resolve({ id: 'a', ...data } as never);
        },
      }),
      completeness: {
        evaluate: () =>
          Promise.resolve({ missing: complete.value ? [] : ['COVER'], isComplete: complete.value }),
      },
      notifier,
      logger,
      now: () => NOW,
    }),
  },
});

interface Body {
  data: Record<string, unknown> & Record<string, unknown>[];
  meta?: { total: number };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const auth = (): Record<string, string> => ({
  Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: adminId, ttlSec: 600 }).token}`,
});
const addSalon = (
  name: string,
  submittedAt: string,
  over: Record<string, unknown> = {},
): string => {
  const _id = new Types.ObjectId();
  salons.docs.push({
    _id,
    name,
    businessType: 'SALON',
    audience: 'FEMALE',
    state: 'APPLICATION_PENDING',
    description: 'nice',
    application: {
      submittedAt: new Date(submittedAt),
      resubmissionCount: 0,
      documentKeys: ['licenses/a.pdf', 'licenses/b.pdf'],
    },
    ...over,
  });
  members.docs.push({
    _id: new Types.ObjectId(),
    salonId: _id,
    firstName: `${name}-owner`,
    lastName: 'X',
    phone: '+962791234567',
    role: 'OWNER',
    active: true,
  });
  return _id.toHexString();
};
const post = async (
  id: string,
  action: 'approve' | 'reject',
  body: object,
): Promise<{ status: number; body: unknown }> =>
  await request(app).post(`/admin/v1/salons/applications/${id}/${action}`).set(auth()).send(body);

beforeEach(() => {
  for (const f of [salons, members, subs]) f.docs.length = 0;
  audits.length = 0;
  notified.length = 0;
  notifier.fail = false;
  complete.value = false;
});

describe('GET /admin/v1/salons/applications', () => {
  it('needs an admin token', async () => {
    expect((await request(app).get('/admin/v1/salons/applications')).status).toBe(401);
  });

  it('lists pending applications oldest first with the owner, and filters by state', async () => {
    addSalon('Later', '2026-10-10T00:00:00Z');
    addSalon('Earlier', '2026-10-01T00:00:00Z');
    addSalon('Done', '2026-09-01T00:00:00Z', { state: 'LIVE' });
    const res = await request(app).get('/admin/v1/salons/applications').set(auth());
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.map((r) => r['name'])).toEqual(['Earlier', 'Later']);
    expect(bodyOf(res).data[0]?.['owner']).toMatchObject({
      firstName: 'Earlier-owner',
      phone: '+962791234567',
    });
    expect(bodyOf(res).meta?.total).toBe(2);
    const live = await request(app).get('/admin/v1/salons/applications?state=LIVE').set(auth());
    expect(bodyOf(live).data.map((r) => r['name'])).toEqual(['Done']);
  });

  it('shows one application with signed document links; 404 and 400 for bad ids', async () => {
    const id = addSalon('Glow', '2026-10-01T00:00:00Z');
    const res = await request(app).get(`/admin/v1/salons/applications/${id}`).set(auth());
    expect(bodyOf(res).data['documentUrls']).toHaveLength(2);
    expect(String((bodyOf(res).data['documentUrls'] as string[])[0])).toContain('licenses/a.pdf');
    const missing = await request(app)
      .get(`/admin/v1/salons/applications/${new Types.ObjectId().toHexString()}`)
      .set(auth());
    expect(missing.status).toBe(404);
    expect((await request(app).get('/admin/v1/salons/applications/nope').set(auth())).status).toBe(
      400,
    );
  });
});

describe('approve / reject', () => {
  it('approves: state, review fields, TRIAL subscription for the configured days, audit, notification', async () => {
    const id = addSalon('Glow', '2026-10-01T00:00:00Z');
    const res = await post(id, 'approve', { reason: 'license verified' });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({ state: 'APPROVED_INCOMPLETE' });
    expect(salons.docs[0]?.['state']).toBe('APPROVED_INCOMPLETE');
    const application = salons.docs[0]?.['application'] as Record<string, unknown>;
    expect(application['reviewedAt']).toEqual(NOW);
    expect(String(application['reviewedBy'])).toBe(adminId);
    expect(application['documentKeys']).toHaveLength(2);
    const trialDays = SETTING_DEFAULTS['subscription.trialDays'];
    expect(subs.docs[0]).toMatchObject({
      status: 'TRIAL',
      trialEndsAt: new Date(NOW.getTime() + trialDays * 86_400_000),
    });
    expect(String(subs.docs[0]?.['salonId'])).toBe(id);
    expect(audits[0]).toMatchObject({
      action: 'SALON_APPLICATION_APPROVE',
      reason: 'license verified',
      adminId,
    });
    expect(notified).toEqual([{ salonId: id, decision: 'approved', reason: 'license verified' }]);
  });

  it('approves straight to LIVE when the salon is already complete', async () => {
    const id = addSalon('Glow', '2026-10-01T00:00:00Z');
    complete.value = true;
    const res = await post(id, 'approve', { reason: 'ok' });
    expect(bodyOf(res).data).toMatchObject({ state: 'LIVE' });
    expect(salons.docs[0]?.['completeness']).toEqual({ missing: [], isComplete: true });
  });

  it('rejects: keeps the reason for the owner, no subscription', async () => {
    const id = addSalon('Glow', '2026-10-01T00:00:00Z');
    const res = await post(id, 'reject', { reason: 'blurry license' });
    expect(res.status).toBe(200);
    expect(salons.docs[0]?.['state']).toBe('APPLICATION_REJECTED');
    expect((salons.docs[0]?.['application'] as Record<string, unknown>)['rejectionReason']).toBe(
      'blurry license',
    );
    expect(subs.docs).toHaveLength(0);
    expect(audits[0]).toMatchObject({ action: 'SALON_APPLICATION_REJECT' });
    expect(bodyOf(res).data['rejectionReason']).toBe('blurry license');
  });

  it('requires a reason and only works on pending applications (a second decision is 422)', async () => {
    const id = addSalon('Glow', '2026-10-01T00:00:00Z');
    expect((await post(id, 'approve', {})).status).toBe(400);
    expect((await post(id, 'reject', { reason: '  ' })).status).toBe(400);
    expect(salons.docs[0]?.['state']).toBe('APPLICATION_PENDING');
    expect((await post(id, 'approve', { reason: 'ok' })).status).toBe(200);
    const again = await post(id, 'reject', { reason: 'changed my mind' });
    expect(again.status).toBe(422);
    expect(bodyOf(again).error.code).toBe('INVALID_TRANSITION');
    expect(subs.docs).toHaveLength(1);
    expect(audits).toHaveLength(1);
  });

  it('answers 404 for an unknown salon', async () => {
    const res = await post(new Types.ObjectId().toHexString(), 'approve', { reason: 'x' });
    expect(res.status).toBe(404);
  });

  it('does not create a second subscription and still succeeds when the notification fails', async () => {
    const id = addSalon('Glow', '2026-10-01T00:00:00Z');
    subs.docs.push({ _id: new Types.ObjectId(), salonId: new Types.ObjectId(id), status: 'TRIAL' });
    notifier.fail = true;
    (subs.model as unknown as { create: unknown }).create = (): Promise<never> =>
      Promise.reject(Object.assign(new Error('dup'), { code: 11000 }));
    const res = await post(id, 'approve', { reason: 'ok' });
    expect(res.status).toBe(200);
    expect(subs.docs).toHaveLength(1);
    expect(salons.docs[0]?.['state']).toBe('APPROVED_INCOMPLETE');
  });

  it('answers 503 when unconfigured', async () => {
    expect((await request(createApp({ logger })).get('/admin/v1/salons/applications')).status).toBe(
      503,
    );
  });
});
