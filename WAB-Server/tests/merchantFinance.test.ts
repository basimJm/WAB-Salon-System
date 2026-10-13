import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createMerchantFinanceService } from '../src/domain/finance/merchantFinance.service';
import { createLedgerService } from '../src/domain/ledger/ledger.service';
import { createPayoutsService } from '../src/domain/payouts/payouts.service';
import { createSubscriptionsService } from '../src/domain/subscriptions/subscriptions.service';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { LedgerRepository } from '../src/repositories/ledger.repository';
import { PayoutsRepository } from '../src/repositories/payouts.repository';
import { RefundsRepository } from '../src/repositories/refunds.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { SubscriptionsRepository } from '../src/repositories/subscriptions.repository';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-12T12:00:00Z');
const DAY = 86_400_000;
const day = (offset: number): Date => new Date(NOW.getTime() + offset * DAY);
const m = {
  tx: createFakeModel(),
  refunds: createFakeModel(),
  payouts: createFakeModel(),
  ledger: createFakeModel(),
  bookings: createFakeModel(),
  salons: createFakeModel(),
  subs: createFakeModel(),
};
const salon = new Types.ObjectId();
const other = new Types.ObjectId();
const settings = { get: ((k: string) => Promise.resolve(SETTING_DEFAULTS[k as never])) as never };
const salons = new SalonsRepository(m.salons.model as never);
const payoutsRepo = new PayoutsRepository(m.payouts.model as never);
const audit = { record: (e: unknown) => Promise.resolve(e as never) } as never;
const ledger = createLedgerService({
  entries: new LedgerRepository(m.ledger.model as never),
  transactions: new TransactionsRepository(m.tx.model as never),
  refunds: new RefundsRepository(m.refunds.model as never),
  logger,
  now: () => NOW,
});
const subscriptions = createSubscriptionsService({
  subscriptions: new SubscriptionsRepository(m.subs.model as never),
  salons,
  settings,
  audit,
  now: () => NOW,
});
const service = createMerchantFinanceService({
  payoutsService: createPayoutsService({
    payouts: payoutsRepo,
    ledgerEntries: new LedgerRepository(m.ledger.model as never),
    ledger,
    salons,
    audit,
    notifier: { transferred: () => Promise.resolve() },
    logger,
    now: () => NOW,
  }),
  transactions: new TransactionsRepository(m.tx.model as never),
  refunds: new RefundsRepository(m.refunds.model as never),
  payouts: payoutsRepo,
  bookings: new BookingsRepository(m.bookings.model as never),
  subscriptions,
  salons,
  settings,
});
const guard: RequestHandler = (req, _res, next) => {
  req.member = {
    id: new Types.ObjectId().toHexString(),
    salonId: salon.toHexString(),
    role: 'MANAGER',
    permissions: (req.header('x-perms') ?? 'FINANCE_VIEW,SUBSCRIPTION_VIEW')
      .split(',')
      .filter(Boolean),
  } as never;
  next();
};
const app = createApp({
  logger,
  services: {
    merchantFinance: service,
    salonProfile: { service: undefined as never, guard: [guard] },
  },
});

interface Body {
  data: Record<string, unknown> & unknown[];
  meta?: { total: number; pageSize: number };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const get = (path: string, perms?: string): request.Test => {
  const req = request(app).get(`/merchant/v1${path}`);
  if (perms !== undefined) void req.set('x-perms', perms);
  return req;
};
const rows = (res: { body: unknown }): Record<string, unknown>[] =>
  bodyOf(res).data as unknown as Record<string, unknown>[];

const booking = (reference: string): Types.ObjectId => {
  const _id = new Types.ObjectId();
  m.bookings.docs.push({ _id, referenceNumber: reference, salonId: salon });
  return _id;
};
const tx = (over: Record<string, unknown>): void => {
  m.tx.docs.push({
    _id: new Types.ObjectId(),
    salonId: salon,
    status: 'SUCCEEDED',
    type: 'DEPOSIT',
    amount: 10_000,
    bookingId: new Types.ObjectId(),
    createdAt: NOW,
    ...over,
  });
};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  m.salons.docs.push(
    { _id: salon, name: 'Glow', state: 'LIVE' },
    { _id: other, name: 'Other', state: 'LIVE' },
  );
});

describe('balance card', () => {
  it('shows what is due now, the totals and the last payout, in JOD', async () => {
    const entry = (type: string, amount: number, createdAt: Date, salonId = salon): void => {
      m.ledger.docs.push({ _id: new Types.ObjectId(), salonId, type, amount, createdAt });
    };
    entry('CHARGE', 10_000, day(-5));
    entry('GATEWAY_FEE', -300, day(-5));
    entry('REFUND', -2_500, day(-4));
    m.payouts.docs.push({
      _id: new Types.ObjectId(),
      salonId: salon,
      periodFrom: new Date(0),
      periodTo: day(-3),
      net: 7_200,
      status: 'TRANSFERRED',
    });
    entry('PAYOUT', -7_200, day(-2));
    entry('CHARGE', 4_000, day(-1));
    entry('CHARGE', 999, day(-1), other);
    const res = await get('/finance/balance');
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      balance: '4.000',
      dueNow: '4.000',
      collected: '14.000',
      gatewayFees: '0.300',
      refunds: '2.500',
      paidOut: '7.200',
      lastPayout: { net: '7.200', status: 'TRANSFERRED' },
    });
  });
  it('is zero for a salon with no activity', async () => {
    expect(bodyOf(await get('/finance/balance')).data).toMatchObject({
      balance: '0.000',
      dueNow: '0.000',
      lastPayout: null,
    });
  });
});

describe('transactions', () => {
  it('lists only this salon’s successful booking payments, newest first, with reference, fee and net', async () => {
    const a = booking('WAB-ABC234');
    const b = booking('WAB-DEF567');
    tx({ bookingId: a, gatewayFee: 300, createdAt: day(-2) });
    tx({ bookingId: b, type: 'FULL', amount: 20_000, createdAt: day(-1) });
    tx({ salonId: other });
    tx({ status: 'FAILED' });
    tx({ bookingId: undefined });
    delete m.tx.docs[m.tx.docs.length - 1]?.['bookingId'];
    const res = await get('/finance/transactions');
    expect(rows(res)).toHaveLength(2);
    expect(rows(res)[0]).toMatchObject({
      referenceNumber: 'WAB-DEF567',
      type: 'FULL',
      amount: '20.000',
      gatewayFee: '0.000',
      net: '20.000',
    });
    expect(rows(res)[1]).toMatchObject({
      referenceNumber: 'WAB-ABC234',
      amount: '10.000',
      gatewayFee: '0.300',
      net: '9.700',
    });
    expect(bodyOf(res).meta).toMatchObject({ total: 2, pageSize: 10 });
  });
  it('filters by Amman days, both ends inclusive', async () => {
    tx({ createdAt: new Date('2026-10-11T20:59:59.999Z') }); // 11 Oct 23:59 Amman
    tx({ createdAt: new Date('2026-10-11T21:00:00.000Z') }); // 12 Oct 00:00
    tx({ createdAt: new Date('2026-10-12T20:59:59.999Z') }); // 12 Oct 23:59
    tx({ createdAt: new Date('2026-10-12T21:00:00.000Z') }); // 13 Oct 00:00
    const res = await get('/finance/transactions?from=2026-10-12&to=2026-10-12');
    expect(rows(res)).toHaveLength(2);
    expect(rows(await get('/finance/transactions?from=2026-10-13'))).toHaveLength(1);
    expect(rows(await get('/finance/transactions?to=2026-10-11'))).toHaveLength(1);
  });
  it('paginates and validates the range', async () => {
    for (let i = 0; i < 12; i += 1) tx({ createdAt: day(-i) });
    const second = await get('/finance/transactions?page=2');
    expect(rows(second)).toHaveLength(2);
    expect(bodyOf(second).meta?.total).toBe(12);
    expect((await get('/finance/transactions?from=2026-10-13&to=2026-10-12')).status).toBe(400);
    expect((await get('/finance/transactions?from=2026-02-30')).status).toBe(400);
  });
});

describe('refunds and payouts', () => {
  it('lists this salon’s refunds with status and booking reference', async () => {
    const a = booking('WAB-ABC234');
    m.refunds.docs.push(
      {
        _id: new Types.ObjectId(),
        salonId: salon,
        bookingId: a,
        amount: 2_500,
        source: 'CUSTOMER_CANCEL',
        status: 'REFUNDED',
        createdAt: day(-1),
        completedAt: day(-1),
      },
      {
        _id: new Types.ObjectId(),
        salonId: salon,
        amount: 10_000,
        source: 'SALON_REJECT',
        reason: 'SLOT_UNAVAILABLE',
        status: 'REFUND_PENDING',
        createdAt: day(-2),
      },
      {
        _id: new Types.ObjectId(),
        salonId: other,
        amount: 1,
        source: 'ADMIN',
        status: 'REFUNDED',
        createdAt: day(-1),
      },
    );
    const list = rows(await get('/finance/refunds'));
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      referenceNumber: 'WAB-ABC234',
      amount: '2.500',
      status: 'REFUNDED',
    });
    expect(list[1]).toMatchObject({
      referenceNumber: null,
      bookingId: null,
      reason: 'SLOT_UNAVAILABLE',
      completedAt: null,
    });
  });
  it('lists this salon’s payouts', async () => {
    m.payouts.docs.push(
      {
        _id: new Types.ObjectId(),
        salonId: salon,
        periodFrom: day(-10),
        periodTo: day(-3),
        gross: 10_000,
        fees: 300,
        refunds: 0,
        adjustments: 0,
        net: 9_700,
        status: 'TRANSFERRED',
        transferredAt: day(-2),
        transferReference: 'BANK-1',
        createdAt: day(-3),
      },
      {
        _id: new Types.ObjectId(),
        salonId: other,
        periodFrom: day(-10),
        periodTo: day(-3),
        gross: 1,
        fees: 0,
        refunds: 0,
        adjustments: 0,
        net: 1,
        status: 'PENDING',
        createdAt: day(-3),
      },
    );
    const list = rows(await get('/finance/payouts'));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      gross: '10.000',
      fees: '0.300',
      net: '9.700',
      status: 'TRANSFERRED',
      transferReference: 'BANK-1',
    });
  });
});

describe('permissions', () => {
  it('every finance route needs FINANCE_VIEW, the subscription needs SUBSCRIPTION_VIEW', async () => {
    for (const path of [
      '/finance/balance',
      '/finance/transactions',
      '/finance/refunds',
      '/finance/payouts',
    ]) {
      const res = await get(path, 'SUBSCRIPTION_VIEW');
      expect(res.status).toBe(403);
      expect(bodyOf(res).error.code).toBe('PERMISSION_DENIED');
    }
    expect((await get('/subscription', 'FINANCE_VIEW')).status).toBe(403);
    expect((await get('/finance/balance', 'FINANCE_VIEW')).status).toBe(200);
  });
});

describe('subscription', () => {
  const sub = (over: Record<string, unknown>): void => {
    m.subs.docs.push({
      _id: new Types.ObjectId(),
      salonId: salon,
      status: 'TRIAL',
      trialEndsAt: day(60),
      payments: [],
      ...over,
    });
  };
  it('shows the trial with days left and no warning far from the end', async () => {
    sub({});
    const res = await get('/subscription');
    expect(bodyOf(res).data).toMatchObject({
      status: 'TRIAL',
      salonState: 'LIVE',
      daysRemaining: 60,
      endingSoon: false,
      currentPeriodEnd: null,
      lastPaymentAt: null,
    });
    expect(JSON.stringify(res.body)).not.toContain('reference');
  });
  it('warns within the configured days; an expired subscription is not "ending soon"', async () => {
    sub({ trialEndsAt: day(5) });
    expect(bodyOf(await get('/subscription')).data['endingSoon']).toBe(true);
    m.subs.docs.length = 0;
    sub({ status: 'EXPIRED', trialEndsAt: day(-3) });
    expect(bodyOf(await get('/subscription')).data).toMatchObject({
      status: 'EXPIRED',
      endingSoon: false,
      daysRemaining: -3,
    });
  });
  it('an active subscription ends with its paid period and shows the last payment date', async () => {
    sub({
      status: 'ACTIVE',
      trialEndsAt: day(-60),
      currentPeriodEnd: day(20),
      payments: [
        {
          amount: 30_000,
          paidAt: day(-10),
          periodFrom: day(-10),
          periodTo: day(20),
          method: 'CASH',
          reference: 'SECRET-REF',
          recordedBy: new Types.ObjectId(),
        },
      ],
    });
    const res = await get('/subscription');
    expect(bodyOf(res).data).toMatchObject({
      status: 'ACTIVE',
      daysRemaining: 20,
      lastPaymentAt: day(-10).toISOString(),
    });
    expect(JSON.stringify(res.body)).not.toContain('SECRET-REF');
  });
  it('is 404 for a salon without a subscription yet', async () => {
    expect((await get('/subscription')).status).toBe(404);
  });
});
