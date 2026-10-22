import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createPaymentsService } from '../src/domain/payments/payments.service';
import { requireAuth } from '../src/middlewares/auth';
import { FakePaymentProvider } from '../src/providers/payments/fake';
import { FAKE_WEBHOOK_SIGNATURE } from '../src/constants/providers';
import { BookingDraftsRepository } from '../src/repositories/bookingDrafts.repository';
import { CustomersRepository } from '../src/repositories/identity.repository';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T08:00:00Z');
const m = { drafts: createFakeModel(), customers: createFakeModel(), tx: createFakeModel() };
const gateway = new FakePaymentProvider();
const settledIds: string[] = [];
let clock = NOW;
const me = new Types.ObjectId();
const salon = new Types.ObjectId();

const app = createApp({
  logger,
  services: {
    payments: createPaymentsService({
      transactions: new TransactionsRepository(m.tx.model as never),
      drafts: new BookingDraftsRepository(m.drafts.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      provider: gateway,
      providerName: 'fake',
      logger,
      onSettled: {
        settled: (t) => {
          settledIds.push(t.id);
          return Promise.resolve();
        },
      },
      now: () => clock,
    }),
    installations: {
      service: undefined as never,
      customerOptional: requireAuth('customer', SECRET),
      customerRequired: requireAuth('customer', SECRET),
      merchantRequired: requireAuth('merchant', SECRET),
    },
  },
});
const token = (who: Types.ObjectId): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'CUSTOMER', subjectId: who.toHexString(), ttlSec: 600 }).token}`;

interface Body {
  data: {
    transactionId: string;
    status: string;
    attempt: number;
    amount: string;
    type: string;
    sessionId: string | null;
    gatewayCode: string | null;
  };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;

const draft = (over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  m.drafts.docs.push({
    _id,
    customerId: me,
    salonId: salon,
    totals: { total: 10_000, dueOnline: 2_000 },
    paymentMethod: 'DEPOSIT',
    otpVerifiedAt: NOW,
    expiresAt: new Date(NOW.getTime() + 600_000),
    ...over,
  });
  return _id.toHexString();
};
const start = (draftId: string, who = me, extra: object = {}): request.Test =>
  request(app)
    .post('/customer/v1/payments')
    .set('Authorization', token(who))
    .send({ draftId, platform: 'ANDROID', appVersion: '1.0.0', ...extra });
const verify = (id: string, who = me): request.Test =>
  request(app).post(`/customer/v1/payments/${id}/verify`).set('Authorization', token(who)).send();
const stored = (): Record<string, unknown>[] => m.tx.docs;

beforeEach(() => {
  settledIds.length = 0;
  clock = NOW;
  for (const f of Object.values(m)) f.docs.length = 0;
  m.customers.docs.push({ _id: me, status: 'ACTIVE' });
  gateway.scenarioForNextSession('success');
});

describe('POST /customer/v1/payments', () => {
  it('starts a PENDING attempt for the amount due online and links it to the draft', async () => {
    const d = draft();
    const res = await start(d);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      status: 'PENDING',
      attempt: 1,
      amount: '2.000',
      type: 'DEPOSIT',
    });
    expect(bodyOf(res).data.sessionId).toMatch(/^fake-session-/);
    expect(stored()[0]).toMatchObject({
      idempotencyKey: `${d}:1`,
      amount: 2_000,
      currency: 'JOD',
      provider: 'fake',
      platform: 'ANDROID',
      appVersion: '1.0.0',
      status: 'PENDING',
    });
    expect(String(m.drafts.docs[0]?.['transactionId'])).toBe(bodyOf(res).data.transactionId);
  });
  it('a full-payment draft is a FULL transaction for the whole total', async () => {
    const d = draft({ paymentMethod: 'FULL_ONLINE', totals: { total: 12_345, dueOnline: 12_345 } });
    expect(bodyOf(await start(d)).data).toMatchObject({ type: 'FULL', amount: '12.345' });
  });
  it('a running attempt is returned again, not duplicated', async () => {
    const d = draft();
    const first = bodyOf(await start(d)).data;
    const again = bodyOf(await start(d)).data;
    expect(again.transactionId).toBe(first.transactionId);
    expect(stored()).toHaveLength(1);
  });
  it('after a failed attempt a new one starts with the next key', async () => {
    const d = draft();
    gateway.scenarioForNextSession('fail');
    const first = bodyOf(await start(d)).data;
    expect(bodyOf(await verify(first.transactionId)).data.status).toBe('FAILED');
    gateway.scenarioForNextSession('success');
    const second = bodyOf(await start(d)).data;
    expect(second).toMatchObject({ attempt: 2, status: 'PENDING' });
    expect(stored().map((t) => t['idempotencyKey'])).toEqual([`${d}:1`, `${d}:2`]);
  });
  it('refuses pay on arrival, an unconfirmed or expired draft, other customers’ drafts', async () => {
    const arrival = draft({
      paymentMethod: 'PAY_ON_ARRIVAL',
      totals: { total: 100, dueOnline: 0 },
    });
    expect(bodyOf(await start(arrival)).error.code).toBe('PAYMENT_OPTION_NOT_ALLOWED');
    const noOtp = draft();
    delete m.drafts.docs[m.drafts.docs.length - 1]?.['otpVerifiedAt'];
    expect(bodyOf(await start(noOtp)).error.code).toBe('OTP_INVALID');
    const old = draft({ expiresAt: new Date(NOW.getTime() - 1) });
    expect(bodyOf(await start(old)).error.code).toBe('DRAFT_EXPIRED');
    const stranger = new Types.ObjectId();
    m.customers.docs.push({ _id: stranger, status: 'ACTIVE' });
    expect((await start(draft(), stranger)).status).toBe(404);
    expect(stored()).toHaveLength(0);
  });
  it('a blocked customer cannot pay; the body is validated; a token is required', async () => {
    const d = draft();
    m.customers.docs[0] = { _id: me, status: 'BLOCKED' };
    expect(bodyOf(await start(d)).error.code).toBe('ACCOUNT_BLOCKED');
    m.customers.docs[0] = { _id: me, status: 'ACTIVE' };
    expect((await start(d, me, { platform: 'PALM' })).status).toBe(400);
    expect((await start('nope')).status).toBe(400);
    expect((await request(app).post('/customer/v1/payments').send({})).status).toBe(401);
  });
});

describe('POST /customer/v1/payments/:id/verify', () => {
  it('settles from the gateway’s answer, with its code and the fee', async () => {
    const d = draft();
    const started = bodyOf(await start(d)).data;
    const res = await verify(started.transactionId);
    expect(bodyOf(res).data.status).toBe('SUCCEEDED');
    expect(stored()[0]).toMatchObject({ status: 'SUCCEEDED' });
    expect(stored()[0]?.['gatewayCode']).toBeDefined();
    expect((stored()[0]?.['raw'] as { verifiedAt: string }).verifiedAt).toBe(NOW.toISOString());
  });
  it('stays PENDING while the gateway is still working, then settles', async () => {
    const d = draft();
    gateway.scenarioForNextSession('pending');
    const started = bodyOf(await start(d)).data;
    expect(bodyOf(await verify(started.transactionId)).data.status).toBe('PENDING');
    gateway.settle(started.sessionId ?? '', 'success');
    expect(bodyOf(await verify(started.transactionId)).data.status).toBe('SUCCEEDED');
  });
  it('records cancelled payments', async () => {
    const d = draft();
    gateway.scenarioForNextSession('cancel');
    const started = bodyOf(await start(d)).data;
    expect(bodyOf(await verify(started.transactionId)).data.status).toBe('CANCELLED');
  });
  it('a settled attempt is not asked again and cannot be changed by a later answer', async () => {
    const d = draft();
    gateway.scenarioForNextSession('pending');
    const started = bodyOf(await start(d)).data;
    gateway.settle(started.sessionId ?? '', 'success');
    await verify(started.transactionId);
    gateway.settle(started.sessionId ?? '', 'fail');
    expect(bodyOf(await verify(started.transactionId)).data.status).toBe('SUCCEEDED');
  });
  it('a gateway amount different from the requested one never counts as paid', async () => {
    const d = draft();
    const started = bodyOf(await start(d)).data;
    m.tx.docs[0] = { ...m.tx.docs[0], amount: 1_500 };
    const res = await verify(started.transactionId);
    expect(bodyOf(res).data).toMatchObject({ status: 'FAILED', gatewayCode: 'AMOUNT_MISMATCH' });
  });
  it('only the owner can verify; unknown and malformed ids', async () => {
    const started = bodyOf(await start(draft())).data;
    const stranger = new Types.ObjectId();
    expect((await verify(started.transactionId, stranger)).status).toBe(404);
    expect((await verify(new Types.ObjectId().toHexString())).status).toBe(404);
    expect((await verify('nope')).status).toBe(400);
  });
});

describe('checkout data for the app', () => {
  it('returns what the app opens the gateway UI with while the attempt is payable', async () => {
    gateway.scenarioForNextSession('pending');
    const started = bodyOf(await start(draft())).data as unknown as {
      transactionId: string;
      sessionId: string;
      checkout: Record<string, unknown> | null;
    };
    expect(started.checkout).toEqual({
      provider: 'fake',
      environment: 'dev',
      checkoutId: started.sessionId,
      brands: ['VISA', 'MASTER'],
      shopperResultUrl: 'fake://payment/result',
    });
    gateway.settle(started.sessionId, 'success');
    const done = bodyOf(await verify(started.transactionId)).data as unknown as {
      checkout: unknown;
    };
    expect(done.checkout).toBeNull();
  });
});

describe('POST /webhooks/payments', () => {
  const hook = (
    body: object | string,
    signature: string | null = FAKE_WEBHOOK_SIGNATURE,
  ): request.Test => {
    const req = request(app).post('/webhooks/payments').set('Content-Type', 'application/json');
    if (signature !== null) void req.set('X-Signature', signature);
    return req.send(typeof body === 'string' ? body : JSON.stringify(body));
  };
  const event = (sessionId: string, status = 'SUCCEEDED'): object => ({
    sessionId,
    status,
    gatewayCode: '000.000.000',
    gatewayMessage: 'ok',
  });
  const startPending = async (): Promise<{ id: string; sessionId: string }> => {
    gateway.scenarioForNextSession('pending');
    const started = bodyOf(await start(draft())).data;
    return { id: started.transactionId, sessionId: started.sessionId ?? '' };
  };

  it('settles from the gateway’s confirmed result and acknowledges repeats without settling twice', async () => {
    const { id, sessionId } = await startPending();
    gateway.settle(sessionId, 'success');
    const first = await hook(event(sessionId));
    expect(first.status).toBe(200);
    expect((first.body as { data: { settled: boolean } }).data.settled).toBe(true);
    expect(stored()[0]).toMatchObject({ status: 'SUCCEEDED' });
    const again = await hook(event(sessionId));
    expect((again.body as { data: { settled: boolean } }).data.settled).toBe(false);
    expect(settledIds).toEqual([id]);
  });
  it('never trusts the notification alone: the gateway is asked', async () => {
    const { sessionId } = await startPending();
    const res = await hook(event(sessionId, 'SUCCEEDED'));
    expect(res.status).toBe(200);
    expect((res.body as { data: { settled: boolean } }).data.settled).toBe(false);
    expect(stored()[0]?.['status']).toBe('PENDING');
    expect(settledIds).toEqual([]);
  });
  it('rejects a bad or missing signature and a body that is not JSON', async () => {
    const { sessionId } = await startPending();
    expect((await hook(event(sessionId), 'forged')).status).toBe(401);
    expect((await hook(event(sessionId), null)).status).toBe(401);
    expect((await hook('not json')).status).toBe(400);
    expect(stored()[0]?.['status']).toBe('PENDING');
  });
  it('reads the signature from the gateway tag header and passes every header through', async () => {
    const { sessionId } = await startPending();
    gateway.settle(sessionId, 'success');
    const res = await request(app)
      .post('/webhooks/payments')
      .set('Content-Type', 'application/json')
      .set('X-Authentication-Tag', FAKE_WEBHOOK_SIGNATURE)
      .set('X-Initialization-Vector', 'aa')
      .send(JSON.stringify(event(sessionId)));
    expect((res.body as { data: { settled: boolean } }).data.settled).toBe(true);
  });
  it('acknowledges refund and ignored notifications without settling anything', async () => {
    const { sessionId } = await startPending();
    gateway.settle(sessionId, 'success');
    for (const kind of ['REFUND', 'IGNORED']) {
      const res = await hook({ ...event(sessionId), kind });
      expect(res.status).toBe(200);
      expect((res.body as { data: { settled: boolean } }).data.settled).toBe(false);
    }
    expect(stored()[0]?.['status']).toBe('PENDING');
  });
  it('acknowledges an unknown session', async () => {
    const res = await hook(event('fake-session-999'));
    expect(res.status).toBe(200);
    expect((res.body as { data: { settled: boolean } }).data.settled).toBe(false);
  });
  it('verify and webhook racing settle once and call the hook once', async () => {
    const { id, sessionId } = await startPending();
    gateway.settle(sessionId, 'success');
    await Promise.all([verify(id), hook(event(sessionId)), verify(id)]);
    expect(settledIds).toEqual([id]);
  });
  it('is not served under the client namespaces', async () => {
    expect((await request(app).post('/customer/v1/webhooks/payments').send({})).status).toBe(404);
  });
});

describe('payment reconciliation (polling fallback)', () => {
  const service = (): ReturnType<typeof createPaymentsService> =>
    createPaymentsService({
      transactions: new TransactionsRepository(m.tx.model as never),
      drafts: new BookingDraftsRepository(m.drafts.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      provider: gateway,
      providerName: 'fake',
      logger,
      now: () => clock,
    });
  const pendingAttempt = async (): Promise<{ id: string; sessionId: string }> => {
    gateway.scenarioForNextSession('pending');
    const started = bodyOf(await start(draft())).data;
    return { id: started.transactionId, sessionId: started.sessionId ?? '' };
  };

  it('settles attempts that waited long enough and leaves recent or unfinished ones', async () => {
    const old = await pendingAttempt();
    gateway.settle(old.sessionId, 'success');
    const unfinished = await pendingAttempt();
    const recent = await pendingAttempt();
    // The first two attempts are 3 minutes old by the time of the run; the last one is brand new.
    const later = new Date(NOW.getTime() + 3 * 60_000);
    for (const d of m.tx.docs) d['createdAt'] = String(d['_id']) === recent.id ? later : NOW;
    clock = later;
    expect(await service().reconcilePending()).toBe(1);
    const status = (id: string): unknown =>
      m.tx.docs.find((d) => String(d['_id']) === id)?.['status'];
    expect(status(old.id)).toBe('SUCCEEDED');
    expect(status(unfinished.id)).toBe('PENDING');
    expect(status(recent.id)).toBe('PENDING');
    expect(await service().reconcilePending()).toBe(0);
  });
  it('one unreachable answer does not stop the others', async () => {
    const good = await pendingAttempt();
    gateway.settle(good.sessionId, 'fail');
    m.tx.docs.unshift({
      _id: new Types.ObjectId(),
      status: 'PENDING',
      providerRef: 'missing-session',
      createdAt: NOW,
    });
    for (const d of m.tx.docs) d['createdAt'] = NOW;
    clock = new Date(NOW.getTime() + 3 * 60_000);
    expect(await service().reconcilePending()).toBe(1);
    expect(m.tx.docs.find((d) => String(d['_id']) === good.id)?.['status']).toBe('FAILED');
  });
});

describe('refunding abandoned payments', () => {
  const orphanService = (
    refunded: string[],
    fail = false,
  ): ReturnType<typeof createPaymentsService> =>
    createPaymentsService({
      transactions: new TransactionsRepository(m.tx.model as never),
      drafts: new BookingDraftsRepository(m.drafts.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      provider: gateway,
      providerName: 'fake',
      logger,
      refunds: {
        refundPayment: ({ transactionId }) => {
          if (fail) return Promise.reject(new Error('gateway down'));
          refunded.push(transactionId);
          return Promise.resolve(true);
        },
      },
      now: () => new Date(NOW.getTime() + 31 * 60_000),
    });
  const payment = (over: Record<string, unknown>): string => {
    const _id = new Types.ObjectId();
    m.tx.docs.push({ _id, status: 'SUCCEEDED', createdAt: NOW, ...over });
    return _id.toHexString();
  };

  it('refunds only old successful payments that never became a booking', async () => {
    const orphan = payment({});
    payment({ bookingId: new Types.ObjectId() });
    payment({ refundedAt: NOW });
    payment({ status: 'PENDING' });
    payment({ createdAt: new Date(NOW.getTime() + 20 * 60_000) });
    const refunded: string[] = [];
    expect(await orphanService(refunded).refundOrphans()).toBe(1);
    expect(refunded).toEqual([orphan]);
  });
  it('one failure does not stop the rest and nothing happens without a refund service', async () => {
    payment({});
    expect(await orphanService([], true).refundOrphans()).toBe(0);
    const plain = createPaymentsService({
      transactions: new TransactionsRepository(m.tx.model as never),
      drafts: new BookingDraftsRepository(m.drafts.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      provider: gateway,
      providerName: 'fake',
      logger,
    });
    expect(await plain.refundOrphans()).toBe(0);
  });
});
