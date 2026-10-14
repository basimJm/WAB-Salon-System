import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAdminTransactionsService } from '../src/domain/finance/adminTransactions.service';
import { requireAuth } from '../src/middlewares/auth';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const fake = createFakeModel();
const NOW = Date.now();
const old = new Date(NOW - 3_600_000);
const salonA = new Types.ObjectId();
const salonB = new Types.ObjectId();
const draft = new Types.ObjectId();
const token = (type: 'ADMIN' | 'CUSTOMER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: new Types.ObjectId().toHexString(), ttlSec: 600 }).token}`;
interface Body {
  data: Record<string, unknown>;
  meta?: { total: number };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminTransactions: createAdminTransactionsService({
      transactions: new TransactionsRepository(fake.model as never),
    }),
  },
});
const add = (over: Record<string, unknown>): Types.ObjectId => {
  const _id = new Types.ObjectId();
  fake.docs.push({
    _id,
    customerId: new Types.ObjectId(),
    salonId: salonA,
    type: 'DEPOSIT',
    amount: 5_000,
    currency: 'JOD',
    attempt: 1,
    provider: 'fake',
    status: 'SUCCEEDED',
    platform: 'ANDROID',
    appVersion: '1.0.0',
    createdAt: old,
    ...over,
  });
  return _id;
};

beforeEach(() => {
  fake.docs.length = 0;
});

describe('admin transactions', () => {
  it('requires an admin token', async () => {
    expect((await request(app).get('/admin/v1/transactions')).status).toBe(401);
    expect(
      (await request(app).get('/admin/v1/transactions').set('Authorization', token('CUSTOMER')))
        .status,
    ).toBe(403);
  });

  it('lists with filters and formats money', async () => {
    add({ status: 'FAILED', gatewayCode: '800.100' });
    add({ salonId: salonB });
    const all = await request(app).get('/admin/v1/transactions').set('Authorization', token());
    expect(bodyOf(all).meta?.total).toBe(2);
    const failed = await request(app)
      .get('/admin/v1/transactions?status=FAILED')
      .set('Authorization', token());
    expect(bodyOf(failed).meta?.total).toBe(1);
    expect((bodyOf(failed).data as unknown as Record<string, unknown>[])[0]?.amount).toBe('5.000');
    const bySalon = await request(app)
      .get(`/admin/v1/transactions?salonId=${salonB.toHexString()}`)
      .set('Authorization', token());
    expect(bodyOf(bySalon).meta?.total).toBe(1);
    const range = await request(app)
      .get(`/admin/v1/transactions?from=${new Date(NOW).toISOString()}`)
      .set('Authorization', token());
    expect(bodyOf(range).meta?.total).toBe(0);
  });

  it('rejects bad filters', async () => {
    const res = await request(app)
      .get('/admin/v1/transactions?status=NOPE')
      .set('Authorization', token());
    expect(res.status).toBe(400);
  });

  it('shows one attempt with the attempts of its checkout', async () => {
    const first = add({ bookingDraftId: draft, attempt: 1, status: 'FAILED', raw: { code: 'x' } });
    add({ bookingDraftId: draft, attempt: 2 });
    add({ bookingDraftId: new Types.ObjectId() });
    const res = await request(app)
      .get(`/admin/v1/transactions/${first.toHexString()}`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.raw).toEqual({ code: 'x' });
    expect((bodyOf(res).data.attempts as { attempt: number }[]).map((a) => a.attempt)).toEqual([
      2, 1,
    ]);
    const missing = await request(app)
      .get(`/admin/v1/transactions/${new Types.ObjectId().toHexString()}`)
      .set('Authorization', token());
    expect(missing.status).toBe(404);
  });

  it('reconciliation lists the three problem kinds and ignores fresh or healthy rows', async () => {
    const stuck = add({ status: 'PENDING' });
    const orphan = add({});
    const uncharged = add({ bookingId: new Types.ObjectId() });
    add({ bookingId: new Types.ObjectId(), chargedAt: old });
    add({ status: 'PENDING', createdAt: new Date(NOW) });
    add({ refundedAt: old });
    const res = await request(app)
      .get('/admin/v1/finance/reconciliation')
      .set('Authorization', token());
    const ids = (key: string): string[] =>
      (bodyOf(res).data[key] as { id: string }[]).map((t) => t.id);
    expect(ids('stuckPending')).toEqual([stuck.toHexString()]);
    expect(ids('paidWithoutBooking')).toEqual([orphan.toHexString()]);
    expect(ids('missingLedger')).toEqual([uncharged.toHexString()]);
  });
});
