import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createSubscriptionsService } from '../src/domain/subscriptions/subscriptions.service';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { SubscriptionsRepository } from '../src/repositories/subscriptions.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-12T12:00:00Z');
const DAY = 86_400_000;
const day = (offset: number): Date => new Date(NOW.getTime() + offset * DAY);
const m = { subs: createFakeModel(), salons: createFakeModel() };
const audits: Record<string, unknown>[] = [];
const adminId = new Types.ObjectId();

const service = createSubscriptionsService({
  subscriptions: new SubscriptionsRepository(m.subs.model as never),
  salons: new SalonsRepository(m.salons.model as never),
  settings: { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) },
  audit: {
    record: (entry: Record<string, unknown>) => {
      audits.push(entry);
      return Promise.resolve(entry as never);
    },
  },
  now: () => NOW,
});
const guard: RequestHandler = (req, _res, next) => {
  req.auth = {
    subjectType: 'ADMIN',
    subjectId: adminId.toHexString(),
    scope: 'admin',
    expiresAt: day(1),
  } as never;
  next();
};
const app = createApp({ logger, services: { adminGuard: guard, adminSubscriptions: service } });

const addSalon = (name: string): Types.ObjectId => {
  const _id = new Types.ObjectId();
  m.salons.docs.push({ _id, name, state: 'LIVE' });
  return _id;
};
const addSub = (salonId: Types.ObjectId, over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  m.subs.docs.push({
    _id,
    salonId,
    status: 'TRIAL',
    trialEndsAt: day(60),
    payments: [],
    ...over,
  });
  return _id.toHexString();
};
const subOf = (salonId: Types.ObjectId): Record<string, unknown> =>
  m.subs.docs.find((d) => String(d['salonId']) === salonId.toHexString()) ?? {};
interface Body {
  data: Record<string, unknown>;
  error: { code: string; details?: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const pay = (salonId: Types.ObjectId, over: Record<string, unknown> = {}): request.Test =>
  request(app)
    .post(`/admin/v1/subscriptions/${salonId.toHexString()}/payments`)
    .send({
      amount: '30.000',
      paidAt: day(-1).toISOString(),
      periodFrom: day(0).toISOString(),
      periodTo: day(30).toISOString(),
      method: 'BANK_TRANSFER',
      reference: 'TRX-1',
      note: 'October',
      ...over,
    });

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  audits.length = 0;
});

describe('recording a payment', () => {
  it('makes a trial ACTIVE until the end of the paid period and audits it', async () => {
    const salon = addSalon('Glow');
    addSub(salon);
    const res = await pay(salon);
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({
      status: 'ACTIVE',
      currentPeriodEnd: day(30).toISOString(),
      endsAt: day(30).toISOString(),
      daysRemaining: 30,
      salonName: 'Glow',
      lastPayment: { amount: '30.000', reference: 'TRX-1', method: 'BANK_TRANSFER' },
    });
    expect((subOf(salon)['payments'] as unknown[]).length).toBe(1);
    expect(audits[0]).toMatchObject({
      action: 'SUBSCRIPTION_PAYMENT_RECORD',
      after: { status: 'ACTIVE', amount: 30_000, reference: 'TRX-1' },
      reason: 'October',
      adminId: adminId.toHexString(),
    });
  });
  it('extends to the later end: an earlier period never shortens it; an expired salon is revived', async () => {
    const salon = addSalon('Glow');
    addSub(salon, { status: 'EXPIRED', currentPeriodEnd: day(-5) });
    expect(bodyOf(await pay(salon)).data['status']).toBe('ACTIVE');
    const earlier = await pay(salon, {
      reference: 'TRX-2',
      periodFrom: day(-60).toISOString(),
      periodTo: day(-30).toISOString(),
    });
    expect(bodyOf(earlier).data['currentPeriodEnd']).toBe(day(30).toISOString());
    const later = await pay(salon, {
      reference: 'TRX-3',
      periodFrom: day(30).toISOString(),
      periodTo: day(60).toISOString(),
    });
    expect(bodyOf(later).data['currentPeriodEnd']).toBe(day(60).toISOString());
    expect((subOf(salon)['payments'] as unknown[]).length).toBe(3);
  });
  it('rejects bad input and double entries, and changes nothing', async () => {
    const salon = addSalon('Glow');
    addSub(salon);
    for (const over of [
      { amount: '0.000' },
      { amount: 'abc' },
      { periodTo: day(0).toISOString() },
      { periodTo: day(-1).toISOString() },
      { paidAt: day(1).toISOString() },
      { reference: '' },
      { method: '' },
    ]) {
      expect((await pay(salon, over)).status).toBe(400);
    }
    expect((subOf(salon)['payments'] as unknown[]).length).toBe(0);
    expect(subOf(salon)['status']).toBe('TRIAL');
    expect((await pay(salon)).status).toBe(201);
    const again = await pay(salon);
    expect(again.status).toBe(409);
    expect((subOf(salon)['payments'] as unknown[]).length).toBe(1);
    expect(audits).toHaveLength(1);
  });
  it('unknown salons and salons without a subscription are 404', async () => {
    expect((await pay(new Types.ObjectId())).status).toBe(404);
    const salon = addSalon('No subscription');
    expect((await pay(salon)).status).toBe(404);
  });
});

describe('listing', () => {
  it('shows status, end date and days remaining; filters by status and by ending soon', async () => {
    const soon = addSalon('Soon');
    addSub(soon, { trialEndsAt: day(5) });
    const later = addSalon('Later');
    addSub(later, { trialEndsAt: day(40) });
    const paid = addSalon('Paid');
    addSub(paid, { status: 'ACTIVE', currentPeriodEnd: day(3), trialEndsAt: day(-50) });
    const gone = addSalon('Gone');
    addSub(gone, { status: 'EXPIRED', trialEndsAt: day(-10) });
    const all = await request(app).get('/admin/v1/subscriptions');
    const rows = bodyOf(all).data as unknown as { salonName: string; daysRemaining: number }[];
    expect(rows).toHaveLength(4);
    expect(rows.find((r) => r.salonName === 'Soon')?.daysRemaining).toBe(5);
    expect(rows.find((r) => r.salonName === 'Gone')?.daysRemaining).toBe(-10);
    const expired = await request(app).get('/admin/v1/subscriptions?status=EXPIRED');
    expect(
      (bodyOf(expired).data as unknown as { salonName: string }[]).map((r) => r.salonName),
    ).toEqual(['Gone']);
    const ending = await request(app).get('/admin/v1/subscriptions?endingInDays=7');
    expect(
      (bodyOf(ending).data as unknown as { salonName: string }[]).map((r) => r.salonName).sort(),
    ).toEqual(['Paid', 'Soon']);
    expect((await request(app).get(`/admin/v1/subscriptions/${soon.toHexString()}`)).status).toBe(
      200,
    );
    expect(
      (await request(app).get(`/admin/v1/subscriptions/${new Types.ObjectId().toHexString()}`))
        .status,
    ).toBe(404);
  });
});

describe('daily jobs', () => {
  it('expires trials and paid periods that ended, leaves the rest, and never touches the salon', async () => {
    const a = addSalon('Trial over');
    addSub(a, { trialEndsAt: day(-1) });
    const b = addSalon('Trial running');
    addSub(b, { trialEndsAt: day(1) });
    const c = addSalon('Period over');
    addSub(c, { status: 'ACTIVE', trialEndsAt: day(-90), currentPeriodEnd: day(-2) });
    const d = addSalon('Period running');
    addSub(d, { status: 'ACTIVE', trialEndsAt: day(-90), currentPeriodEnd: day(10) });
    const e = addSalon('Already expired');
    addSub(e, { status: 'EXPIRED', trialEndsAt: day(-90) });
    const alerts = await service.expireDue();
    expect(alerts.map((x) => x.salonId).sort()).toEqual([a.toHexString(), c.toHexString()].sort());
    expect(subOf(a)['status']).toBe('EXPIRED');
    expect(subOf(b)['status']).toBe('TRIAL');
    expect(subOf(c)['status']).toBe('EXPIRED');
    expect(subOf(d)['status']).toBe('ACTIVE');
    expect(m.salons.docs.every((s) => s['state'] === 'LIVE')).toBe(true);
    expect(await service.expireDue()).toEqual([]);
  });
  it('a payment makes the salon safe from the next run', async () => {
    const salon = addSalon('Glow');
    addSub(salon, { trialEndsAt: day(-1) });
    await pay(salon);
    expect(await service.expireDue()).toEqual([]);
    expect(subOf(salon)['status']).toBe('ACTIVE');
  });
  it('warns once per ending period, 7 days before', async () => {
    const soon = addSalon('Soon');
    addSub(soon, { trialEndsAt: day(6) });
    const far = addSalon('Far');
    addSub(far, { trialEndsAt: day(8) });
    const over = addSalon('Over');
    addSub(over, { trialEndsAt: day(-1) });
    const first = await service.endingSoon();
    expect(first.map((x) => x.salonId)).toEqual([soon.toHexString()]);
    expect(await service.endingSoon()).toEqual([]);
    // A payment moves the end: the next ending is warned again.
    await pay(soon, { periodTo: day(7).toISOString(), periodFrom: day(0).toISOString() });
    const next = await service.endingSoon();
    expect(next.map((x) => x.endsAt.toISOString())).toEqual([day(7).toISOString()]);
  });
});
