import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createBookingCancelService } from '../src/domain/bookings/bookingCancel.service';
import {
  customerCancelRefund,
  fullRefund,
  noShowRefund,
  type NoShowFacts,
  type RefundFacts,
} from '../src/domain/bookings/refunds';
import { requireAuth } from '../src/middlewares/auth';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const HOUR = 3_600_000;
const clock = new Date('2026-10-12T08:00:00Z');
const fake = createFakeModel();
const events: { previous: string; refund: number | undefined }[] = [];
const me = new Types.ObjectId();

const app = createApp({
  logger,
  services: {
    bookingCancel: createBookingCancelService({
      bookings: new BookingsRepository(fake.model as never),
      hook: {
        changed: (_b, previous, info) => {
          events.push({ previous, refund: info?.refundDue });
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

const seed = (over: Record<string, unknown> = {}, startInHours = 24): string => {
  const _id = new Types.ObjectId();
  const start = new Date(clock.getTime() + startInHours * HOUR);
  fake.docs.push({
    _id,
    referenceNumber: 'WAB-ABC234',
    customerId: me,
    salonId: new Types.ObjectId(),
    status: 'PENDING',
    statusHistory: [],
    persons: [],
    appointmentStart: start,
    appointmentEnd: new Date(start.getTime() + HOUR),
    respondBy: new Date(start.getTime() + HOUR),
    paymentMethod: 'PAY_ON_ARRIVAL',
    paymentStatus: 'PAY_ON_ARRIVAL',
    policySnapshot: {
      cancellationWindowHours: 2,
      depositPercentage: 20,
      depositRefundableOnCustomerCancel: true,
      fullPaymentRefundOnCustomerCancel: 'FULL',
    },
    money: { total: 10_000, dueOnline: 0, paidOnline: 0, remaining: 10_000, refunded: 0 },
    ...over,
  });
  return _id.toHexString();
};
interface Body {
  data: { status: string; refundDue: string };
  error: { code: string };
}
const cancel = (id: string, who = me): request.Test =>
  request(app).post(`/customer/v1/bookings/${id}/cancel`).set('Authorization', token(who)).send({});
beforeEach(() => {
  fake.docs.length = 0;
  events.length = 0;
});

type Policy = RefundFacts['policy'];
const basePolicy: Policy = {
  depositPercentage: 20,
  depositRefundableOnCustomerCancel: true,
  fullPaymentRefundOnCustomerCancel: 'FULL',
};
const facts = (over: {
  paymentMethod?: RefundFacts['paymentMethod'];
  money?: RefundFacts['money'];
  policy?: Partial<Policy>;
}): RefundFacts => ({
  paymentMethod: over.paymentMethod ?? 'DEPOSIT',
  money: over.money ?? { total: 10_000, paidOnline: 2_000 },
  policy: { ...basePolicy, ...over.policy },
});

describe('refund calculator §5.8', () => {
  it('pay on arrival and unpaid bookings return nothing', () => {
    expect(customerCancelRefund(facts({ paymentMethod: 'PAY_ON_ARRIVAL' }))).toBe(0);
    expect(customerCancelRefund(facts({ money: { total: 10_000, paidOnline: 0 } }))).toBe(0);
  });
  it('deposit: refunded only when the policy says so', () => {
    expect(customerCancelRefund(facts({}))).toBe(2_000);
    expect(
      customerCancelRefund(facts({ policy: { depositRefundableOnCustomerCancel: false } })),
    ).toBe(0);
  });
  it('full payment: FULL returns everything, MINUS_DEPOSIT keeps the deposit', () => {
    const paid = {
      paymentMethod: 'FULL_ONLINE',
      money: { total: 10_001, paidOnline: 10_001 },
    } as const;
    expect(customerCancelRefund(facts(paid))).toBe(10_001);
    // deposit = round_half_up(10_001 × 20%) = 2_000
    expect(
      customerCancelRefund(
        facts({ ...paid, policy: { fullPaymentRefundOnCustomerCancel: 'MINUS_DEPOSIT' } }),
      ),
    ).toBe(8_001);
  });
  it('MINUS_DEPOSIT without a deposit percentage returns the total', () => {
    const f = facts({
      paymentMethod: 'FULL_ONLINE',
      money: { total: 10_000, paidOnline: 10_000 },
      policy: { fullPaymentRefundOnCustomerCancel: 'MINUS_DEPOSIT' },
    });
    const withoutPercentage: Policy = {
      depositRefundableOnCustomerCancel: f.policy.depositRefundableOnCustomerCancel,
      fullPaymentRefundOnCustomerCancel: f.policy.fullPaymentRefundOnCustomerCancel,
    };
    expect(customerCancelRefund({ ...f, policy: withoutPercentage })).toBe(10_000);
  });
  it('never exceeds what was paid; fullRefund returns the paid amount', () => {
    expect(customerCancelRefund(facts({ money: { total: 10_000, paidOnline: 500 } }))).toBe(500);
    expect(fullRefund({ money: { total: 10_000, paidOnline: 2_000 } })).toBe(2_000);
  });
});

describe('POST /customer/v1/bookings/:id/cancel', () => {
  it('cancels a pending booking at any time and reports the full refund due', async () => {
    const id = seed(
      {
        paymentMethod: 'DEPOSIT',
        money: {
          total: 10_000,
          dueOnline: 2_000,
          paidOnline: 2_000,
          remaining: 8_000,
          refunded: 0,
        },
      },
      0.5,
    );
    const res = await cancel(id);
    expect(res.status).toBe(200);
    expect((res.body as Body).data).toMatchObject({
      status: 'CANCELLED_BY_CUSTOMER',
      refundDue: '2.000',
    });
    expect(fake.docs[0]?.['cancellation']).toMatchObject({
      by: 'CUSTOMER',
      reasonCode: 'CUSTOMER_REQUEST',
    });
    expect(events).toEqual([{ previous: 'PENDING', refund: 2_000 }]);
  });
  it('approved inside the window follows the policy; after the window it is refused', async () => {
    const ok = seed({
      status: 'APPROVED',
      paymentMethod: 'DEPOSIT',
      money: { total: 10_000, dueOnline: 2_000, paidOnline: 2_000, remaining: 8_000, refunded: 0 },
    });
    expect(((await cancel(ok)).body as Body).data.refundDue).toBe('2.000');
    const late = seed({ status: 'APPROVED' }, 1);
    const res = await cancel(late);
    expect(res.status).toBe(422);
    expect((res.body as Body).error.code).toBe('CANCELLATION_WINDOW_PASSED');
    expect(fake.docs.find((d) => String(d['_id']) === late)?.['status']).toBe('APPROVED');
  });
  it('is 404 for someone else’s booking, 422 when already cancelled, 401 without a token', async () => {
    const id = seed();
    expect((await cancel(id, new Types.ObjectId())).status).toBe(404);
    expect((await cancel(id)).status).toBe(200);
    expect((await cancel(id)).status).toBe(422);
    expect((await request(app).post(`/customer/v1/bookings/${id}/cancel`).send({})).status).toBe(
      401,
    );
  });
  it('rejects a malformed id and a completed booking', async () => {
    expect((await cancel('nope')).status).toBe(400);
    const done = seed({ status: 'COMPLETED' });
    expect((await cancel(done)).status).toBe(422);
  });
});

describe('no-show refund calculator §5.9', () => {
  const noShow = (over: {
    paymentMethod?: NoShowFacts['paymentMethod'];
    money?: NoShowFacts['money'];
    policy?: Partial<NoShowFacts['policy']>;
  }): NoShowFacts => ({
    paymentMethod: over.paymentMethod ?? 'DEPOSIT',
    money: over.money ?? { total: 10_000, paidOnline: 2_000 },
    policy: {
      depositPercentage: 20,
      noShowDeposit: 'KEEP',
      noShowFullPayment: 'KEEP',
      ...over.policy,
    },
  });
  const full = {
    paymentMethod: 'FULL_ONLINE',
    money: { total: 10_001, paidOnline: 10_001 },
  } as const;
  it('deposit: KEEP returns 0, REFUND returns the deposit', () => {
    expect(noShowRefund(noShow({}))).toBe(0);
    expect(noShowRefund(noShow({ policy: { noShowDeposit: 'REFUND' } }))).toBe(2_000);
  });
  it('full payment: KEEP 0, REFUND_FULL total, REFUND_MINUS_DEPOSIT total − deposit', () => {
    expect(noShowRefund(noShow(full))).toBe(0);
    expect(noShowRefund(noShow({ ...full, policy: { noShowFullPayment: 'REFUND_FULL' } }))).toBe(
      10_001,
    );
    expect(
      noShowRefund(noShow({ ...full, policy: { noShowFullPayment: 'REFUND_MINUS_DEPOSIT' } })),
    ).toBe(8_001);
  });
  it('pay on arrival and unpaid bookings return nothing', () => {
    expect(noShowRefund(noShow({ paymentMethod: 'PAY_ON_ARRIVAL' }))).toBe(0);
    expect(noShowRefund(noShow({ money: { total: 10_000, paidOnline: 0 } }))).toBe(0);
  });
  it('never exceeds what was paid', () => {
    expect(
      noShowRefund(
        noShow({
          ...full,
          money: { total: 10_001, paidOnline: 100 },
          policy: { noShowFullPayment: 'REFUND_FULL' },
        }),
      ),
    ).toBe(100);
  });
});
