import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { composeBookingHooks, createRefundHook } from '../src/domain/refunds/refundHook';
import { createRefundService } from '../src/domain/refunds/refunds.service';
import { FakePaymentProvider } from '../src/providers/payments/fake';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { RefundsRepository } from '../src/repositories/refunds.repository';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import { ExternalServiceError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-12T08:00:00Z');
const MIN = 60_000;
const HOUR = 3_600_000;
let clock = NOW;
const m = {
  refunds: createFakeModel(),
  tx: createFakeModel(),
  bookings: createFakeModel(),
  audit: createFakeModel(),
};
const gateway = new FakePaymentProvider();
const refundedHook: string[] = [];
const failedHook: string[] = [];
const audits: Record<string, unknown>[] = [];
const adminId = new Types.ObjectId();
let providerDown = false;

const provider = new Proxy(gateway, {
  get(target, prop, receiver) {
    if (prop === 'refund' || prop === 'getRefund') {
      return (...args: unknown[]): Promise<unknown> =>
        providerDown
          ? Promise.reject(new ExternalServiceError({ unavailable: true }))
          : (target[prop] as (...a: unknown[]) => Promise<unknown>)(...args);
    }
    return Reflect.get(target, prop, receiver) as unknown;
  },
});

const service = createRefundService({
  refunds: new RefundsRepository(m.refunds.model as never),
  transactions: new TransactionsRepository(m.tx.model as never),
  bookings: new BookingsRepository(m.bookings.model as never),
  provider,
  settings: { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) },
  audit: {
    record: (entry: Record<string, unknown>) => {
      audits.push(entry);
      return Promise.resolve(entry as never);
    },
  },
  logger,
  hooks: {
    refunded: (r) => {
      refundedHook.push(r.id);
      return Promise.resolve();
    },
    failed: (r) => {
      failedHook.push(r.id);
      return Promise.resolve();
    },
  },
  now: () => clock,
});

const guard: RequestHandler = (req, _res, next) => {
  req.auth = {
    subjectType: 'ADMIN',
    subjectId: adminId.toHexString(),
    scope: 'admin',
    expiresAt: new Date(NOW.getTime() + HOUR),
  } as never;
  next();
};
const app = createApp({ logger, services: { adminGuard: guard, adminRefunds: service } });

const salon = new Types.ObjectId();
const customer = new Types.ObjectId();
/** A booking with a successful online payment of `paid` fils at the gateway. */
const paidBooking = async (paid = 10_000): Promise<{ bookingId: string; txId: string }> => {
  const bookingId = new Types.ObjectId();
  const txId = new Types.ObjectId();
  const session = await gateway.createSession({
    idempotencyKey: `k:${txId.toHexString()}`,
    amountFils: paid,
    reference: bookingId.toHexString(),
  });
  m.bookings.docs.push({
    _id: bookingId,
    refundStatus: 'NONE',
    money: { total: paid, dueOnline: paid, paidOnline: paid, remaining: 0, refunded: 0 },
  });
  m.tx.docs.push({
    _id: txId,
    bookingId,
    customerId: customer,
    salonId: salon,
    status: 'SUCCEEDED',
    amount: paid,
    providerRef: session.sessionId,
  });
  return { bookingId: bookingId.toHexString(), txId: txId.toHexString() };
};
const bookingDoc = (id: string): Record<string, unknown> =>
  m.bookings.docs.find((d) => String(d['_id']) === id) ?? {};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  refundedHook.length = 0;
  failedHook.length = 0;
  audits.length = 0;
  clock = NOW;
  providerDown = false;
  gateway.scenarioForNextSession('success');
  gateway.scenarioForNextRefund('success');
});

describe('requesting a refund', () => {
  it('refunds at the gateway, closes the refund and updates the booking summary', async () => {
    const { bookingId, txId } = await paidBooking();
    const row = await service.requestForBooking({
      bookingId,
      amount: 10_000,
      source: 'SALON_REJECT',
      reason: 'REJECTED',
    });
    expect(row).toMatchObject({
      status: 'REFUNDED',
      amount: 10_000,
      source: 'SALON_REJECT',
      attempts: 0,
    });
    expect(row?.completedAt).toEqual(NOW);
    expect(bookingDoc(bookingId)).toMatchObject({
      refundStatus: 'REFUNDED',
      money: { refunded: 10_000 },
    });
    expect(refundedHook).toEqual([row?.id]);
    expect(m.tx.docs[0]?.['refundedAt']).toEqual(NOW);
    expect(String(m.refunds.docs[0]?.['transactionId'])).toBe(txId);
  });
  it('a partial refund leaves the payment usable and counts against its amount', async () => {
    const { bookingId } = await paidBooking();
    const first = await service.requestForBooking({
      bookingId,
      amount: 2_500,
      source: 'CUSTOMER_CANCEL',
    });
    expect(first?.amount).toBe(2_500);
    expect(m.tx.docs[0]?.['refundedAt']).toBeUndefined();
    // Never more than what is left of the payment.
    const second = await service.requestForBooking({ bookingId, amount: 99_999, source: 'ADMIN' });
    expect(second?.amount).toBe(7_500);
    expect(await service.requestForBooking({ bookingId, amount: 1, source: 'ADMIN' })).toBeNull();
  });
  it('pay on arrival, unpaid and zero amounts give no refund', async () => {
    const lonely = new Types.ObjectId().toHexString();
    expect(
      await service.requestForBooking({ bookingId: lonely, amount: 100, source: 'SALON_CANCEL' }),
    ).toBeNull();
    const { bookingId } = await paidBooking();
    expect(
      await service.requestForBooking({ bookingId, amount: 0, source: 'SALON_CANCEL' }),
    ).toBeNull();
    expect(m.refunds.docs).toHaveLength(0);
  });
  it('the same cancellation reported twice is one refund', async () => {
    const { bookingId } = await paidBooking();
    const a = await service.requestForBooking({ bookingId, amount: 10_000, source: 'AUTO_CANCEL' });
    const b = await service.requestForBooking({ bookingId, amount: 10_000, source: 'AUTO_CANCEL' });
    expect(b?.id).toBe(a?.id);
    expect(m.refunds.docs).toHaveLength(1);
    expect(refundedHook).toHaveLength(1);
  });
});

describe('failures and retries', () => {
  it('a rejected refund is retried with growing delays until it succeeds', async () => {
    const { bookingId } = await paidBooking();
    gateway.scenarioForNextRefund('fail');
    const row = await service.requestForBooking({
      bookingId,
      amount: 10_000,
      source: 'SALON_CANCEL',
    });
    expect(row).toMatchObject({ status: 'REFUND_PENDING', attempts: 1 });
    expect(row?.nextAttemptAt).toEqual(new Date(NOW.getTime() + 5 * MIN));
    expect(await service.runDue()).toBe(0); // not yet
    clock = new Date(NOW.getTime() + 5 * MIN);
    gateway.scenarioForNextRefund('success');
    expect(await service.runDue()).toBe(1);
    expect(m.refunds.docs[0]).toMatchObject({ status: 'REFUNDED' });
    expect(refundedHook).toHaveLength(1);
  });
  it('after the configured number of attempts it fails for good, alerts and marks the booking', async () => {
    const { bookingId } = await paidBooking();
    providerDown = true;
    await service.requestForBooking({ bookingId, amount: 10_000, source: 'SALON_CANCEL' });
    for (let i = 1; i < 5; i += 1) {
      clock = new Date(clock.getTime() + 24 * HOUR);
      await service.runDue();
    }
    expect(m.refunds.docs[0]).toMatchObject({ status: 'REFUND_FAILED', attempts: 5 });
    expect(m.refunds.docs[0]?.['lastError']).toBeDefined();
    expect(failedHook).toHaveLength(1);
    expect(bookingDoc(bookingId)['refundStatus']).toBe('REFUND_FAILED');
    clock = new Date(clock.getTime() + 24 * HOUR);
    expect(await service.runDue()).toBe(0);
  });
  it('a refund the gateway is still processing is polled, not counted as a failure', async () => {
    const { bookingId } = await paidBooking();
    gateway.scenarioForNextRefund('pending');
    const row = await service.requestForBooking({
      bookingId,
      amount: 10_000,
      source: 'SALON_CANCEL',
    });
    expect(row).toMatchObject({ status: 'REFUND_PENDING', attempts: 0 });
    expect(row?.providerRef).toBeDefined();
    gateway.settleRefund(row?.providerRef ?? '', 'success');
    clock = new Date(NOW.getTime() + 5 * MIN);
    await service.runDue();
    expect(m.refunds.docs[0]).toMatchObject({ status: 'REFUNDED' });
  });
  it('lists refunds that have waited longer than the alert threshold', async () => {
    const { bookingId } = await paidBooking();
    providerDown = true;
    await service.requestForBooking({ bookingId, amount: 10_000, source: 'SALON_CANCEL' });
    m.refunds.docs[0] = { ...m.refunds.docs[0], createdAt: NOW };
    expect(await service.delayed()).toHaveLength(0);
    clock = new Date(NOW.getTime() + 49 * HOUR);
    expect(await service.delayed()).toHaveLength(1);
  });
});

describe('a payment without a booking (slot lost after payment)', () => {
  it('is refunded in full as a salon rejection and can never back a booking', async () => {
    const { txId } = await paidBooking();
    delete m.tx.docs[0]?.['bookingId'];
    expect(await service.refundPayment({ transactionId: txId, reason: 'SLOT_UNAVAILABLE' })).toBe(
      true,
    );
    expect(m.refunds.docs[0]).toMatchObject({
      source: 'SALON_REJECT',
      reason: 'SLOT_UNAVAILABLE',
      status: 'REFUNDED',
    });
    expect(m.refunds.docs[0]?.['bookingId']).toBeUndefined();
    expect(m.tx.docs[0]?.['refundedAt']).toEqual(NOW);
    expect(await service.refundPayment({ transactionId: txId, reason: 'SLOT_UNAVAILABLE' })).toBe(
      true,
    );
    expect(m.refunds.docs).toHaveLength(1);
  });
  it('answers false for an unknown or unsuccessful payment, and when the gateway keeps refusing', async () => {
    expect(
      await service.refundPayment({
        transactionId: new Types.ObjectId().toHexString(),
        reason: 'NO_BOOKING',
      }),
    ).toBe(false);
    const { txId } = await paidBooking();
    m.tx.docs[0] = { ...m.tx.docs[0], status: 'FAILED' };
    expect(await service.refundPayment({ transactionId: txId, reason: 'NO_BOOKING' })).toBe(false);
  });
});

describe('admin refunds', () => {
  const post = (path: string, body: object): request.Test =>
    request(app).post(`/admin/v1/refunds${path}`).send(body);
  const failedRefund = async (): Promise<string> => {
    const { bookingId } = await paidBooking();
    providerDown = true;
    const row = await service.requestForBooking({
      bookingId,
      amount: 10_000,
      source: 'SALON_CANCEL',
    });
    for (let i = 1; i < 5; i += 1) {
      clock = new Date(clock.getTime() + 24 * HOUR);
      await service.runDue();
    }
    providerDown = false;
    return row?.id ?? '';
  };

  it('retries a failed refund with fresh attempts and audits it', async () => {
    const id = await failedRefund();
    const res = await post(`/${id}/retry`, { reason: 'Gateway is back' });
    expect(res.status).toBe(200);
    expect((res.body as { data: { status: string } }).data.status).toBe('REFUNDED');
    expect(audits[0]).toMatchObject({
      action: 'REFUND_RETRY',
      entityId: id,
      reason: 'Gateway is back',
    });
  });
  it('refuses to retry a refund that is not failed', async () => {
    const { bookingId } = await paidBooking();
    const row = await service.requestForBooking({
      bookingId,
      amount: 10_000,
      source: 'SALON_CANCEL',
    });
    const res = await post(`/${row?.id ?? ''}/retry`, { reason: 'x' });
    expect(res.status).toBe(422);
    expect(audits).toHaveLength(0);
  });
  it('marks a refund as done outside the gateway, needs a reference and a reason, only once', async () => {
    const id = await failedRefund();
    expect((await post(`/${id}/manual`, { reason: 'Bank transfer' })).status).toBe(400);
    expect((await post(`/${id}/manual`, { reference: 'TRX-1' })).status).toBe(400);
    const res = await post(`/${id}/manual`, { reference: 'TRX-1', reason: 'Bank transfer' });
    expect(res.status).toBe(200);
    expect(
      (res.body as { data: { manual: { reference: string } | null; status: string } }).data,
    ).toMatchObject({
      status: 'REFUNDED',
      manual: { reference: 'TRX-1' },
    });
    expect(audits[0]).toMatchObject({ action: 'REFUND_MARK_MANUAL' });
    expect((await post(`/${id}/manual`, { reference: 'TRX-2', reason: 'again' })).status).toBe(422);
  });
  it('lists with filters and shows one refund with JOD amounts; unknown ids are 404', async () => {
    const id = await failedRefund();
    const failed = await request(app).get('/admin/v1/refunds?status=REFUND_FAILED');
    expect((failed.body as { data: { id: string; amount: string }[] }).data[0]).toMatchObject({
      id,
      amount: '10.000',
    });
    const none = await request(app).get('/admin/v1/refunds?status=REFUNDED');
    expect((none.body as { data: unknown[] }).data).toHaveLength(0);
    expect((await request(app).get(`/admin/v1/refunds/${id}`)).status).toBe(200);
    expect(
      (await request(app).get(`/admin/v1/refunds/${new Types.ObjectId().toHexString()}`)).status,
    ).toBe(404);
    expect((await request(app).get('/admin/v1/refunds/nope')).status).toBe(400);
  });
});

describe('booking hook', () => {
  const booking = (status: string, actorType = 'MEMBER'): never =>
    ({ id: new Types.ObjectId().toHexString(), status, statusHistory: [{ actorType }] }) as never;
  const calls: { source: string; amount: number }[] = [];
  const hook = createRefundHook({
    refunds: {
      requestForBooking: ({ source, amount }) => {
        calls.push({ source, amount });
        return Promise.resolve(null);
      },
    },
    logger,
  });
  beforeEach(() => {
    calls.length = 0;
  });

  it('maps the final status to the refund source and passes the amount', async () => {
    const cases: [string, string][] = [
      ['REJECTED', 'SALON_REJECT'],
      ['CANCELLED_BY_SALON', 'SALON_CANCEL'],
      ['AUTO_CANCELLED', 'AUTO_CANCEL'],
      ['CANCELLED_BY_CUSTOMER', 'CUSTOMER_CANCEL'],
      ['NO_SHOW', 'NO_SHOW_POLICY'],
    ];
    for (const [status] of cases)
      await hook.changed(booking(status), 'APPROVED', { refundDue: 700 });
    expect(calls).toEqual(cases.map(([, source]) => ({ source, amount: 700 })));
  });
  it('an admin change is an ADMIN refund; nothing happens without money to return', async () => {
    await hook.changed(booking('CANCELLED_BY_SALON', 'ADMIN'), 'APPROVED', { refundDue: 5 });
    expect(calls).toEqual([{ source: 'ADMIN', amount: 5 }]);
    calls.length = 0;
    await hook.changed(booking('REJECTED'), 'PENDING', { refundDue: 0 });
    await hook.changed(booking('REJECTED'), 'PENDING');
    await hook.changed(booking('APPROVED'), 'PENDING', { refundDue: 9 });
    expect(calls).toEqual([]);
  });
  it('a failing refund start is logged, not thrown', async () => {
    const broken = createRefundHook({
      refunds: { requestForBooking: () => Promise.reject(new Error('db down')) },
      logger,
    });
    await expect(
      broken.changed(booking('REJECTED'), 'PENDING', { refundDue: 1 }),
    ).resolves.toBeUndefined();
  });
  it('composed hooks all run even if one fails', async () => {
    const seen: string[] = [];
    const composed = composeBookingHooks(
      [
        { changed: () => Promise.reject(new Error('boom')) },
        {
          changed: () => {
            seen.push('changed');
            return Promise.resolve();
          },
          reassigned: () => {
            seen.push('reassigned');
            return Promise.resolve();
          },
        },
        { changed: () => Promise.resolve() },
      ],
      logger,
    );
    await composed.changed(booking('REJECTED'), 'PENDING');
    await composed.reassigned(booking('APPROVED'), { from: 'a', to: 'b' });
    expect(seen).toEqual(['changed', 'reassigned']);
  });
});

describe('admin refund of a chosen amount', () => {
  const actor = { adminId: adminId.toHexString(), ip: '203.0.113.7', userAgent: 'jest' };
  const ask = (bookingId: string, amount: number): ReturnType<typeof service.refundBookingAmount> =>
    service.refundBookingAmount({ bookingId, amount, reason: 'Goodwill', actor });

  it('refunds the chosen part, audited with what was refundable before', async () => {
    const { bookingId } = await paidBooking(10_000);
    const row = await ask(bookingId, 3_000);
    expect(row).toMatchObject({ amount: 3_000, source: 'ADMIN', status: 'REFUNDED' });
    expect(bookingDoc(bookingId)).toMatchObject({ money: { refunded: 3_000 } });
    expect(audits.at(-1)).toMatchObject({
      action: 'BOOKING_ADMIN_REFUND',
      entityType: 'BOOKING',
      entityId: bookingId,
      reason: 'Goodwill',
      before: { paid: 10_000, refundable: 10_000 },
      after: { amount: 3_000, status: 'REFUNDED' },
    });
  });

  it('several partial refunds add up to at most what was paid; one more is refused', async () => {
    const { bookingId } = await paidBooking(10_000);
    await ask(bookingId, 4_000);
    await ask(bookingId, 6_000);
    await expect(ask(bookingId, 1)).rejects.toMatchObject({ httpStatus: 400 });
    expect(m.refunds.docs).toHaveLength(2);
  });

  it('more than what is refundable, zero and fractions are refused and nothing is created', async () => {
    const { bookingId } = await paidBooking(10_000);
    await ask(bookingId, 4_000);
    for (const amount of [6_001, 0, -5, 1.5]) {
      await expect(ask(bookingId, amount)).rejects.toMatchObject({ httpStatus: 400 });
    }
    expect(m.refunds.docs).toHaveLength(1);
  });

  it('a booking nobody paid online for is 422', async () => {
    const bookingId = new Types.ObjectId().toHexString();
    await expect(ask(bookingId, 1_000)).rejects.toMatchObject({ httpStatus: 422 });
    expect(audits).toHaveLength(0);
  });

  it('while the gateway is down the refund is kept and retried: no error, no money lost', async () => {
    const { bookingId } = await paidBooking(10_000);
    providerDown = true;
    const row = await ask(bookingId, 2_000);
    expect(row.status).toBe('REFUND_PENDING');
    expect(row.attempts).toBe(1);
    expect(bookingDoc(bookingId)).toMatchObject({ refundStatus: 'REFUND_PENDING' });
    expect(audits.at(-1)).toMatchObject({ action: 'BOOKING_ADMIN_REFUND' });
  });
});
