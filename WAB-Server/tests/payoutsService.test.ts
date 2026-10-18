import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createLedgerService } from '../src/domain/ledger/ledger.service';
import { createPayoutsService } from '../src/domain/payouts/payouts.service';
import { LedgerRepository } from '../src/repositories/ledger.repository';
import { PayoutsRepository } from '../src/repositories/payouts.repository';
import { RefundsRepository } from '../src/repositories/refunds.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-12T12:00:00Z');
const day = (offset: number): Date => new Date(NOW.getTime() + offset * 86_400_000);
const m = {
  ledger: createFakeModel(),
  payouts: createFakeModel(),
  salons: createFakeModel(),
  tx: createFakeModel(),
  refunds: createFakeModel(),
};
const audits: Record<string, unknown>[] = [];
const notified: string[] = [];
let notifierFails = false;
const adminId = new Types.ObjectId();
const salon = new Types.ObjectId();
const other = new Types.ObjectId();

const entries = new LedgerRepository(m.ledger.model as never);
const ledger = createLedgerService({
  entries,
  transactions: new TransactionsRepository(m.tx.model as never),
  refunds: new RefundsRepository(m.refunds.model as never),
  logger,
  now: () => NOW,
});
const service = createPayoutsService({
  payouts: new PayoutsRepository(m.payouts.model as never),
  ledgerEntries: entries,
  ledger,
  salons: new SalonsRepository(m.salons.model as never),
  audit: {
    record: (entry: Record<string, unknown>) => {
      audits.push(entry);
      return Promise.resolve(entry as never);
    },
  },
  notifier: {
    transferred: (p) => {
      if (notifierFails) return Promise.reject(new Error('push down'));
      notified.push(p.id);
      return Promise.resolve();
    },
  },
  logger,
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
const app = createApp({ logger, services: { adminGuard: guard, adminPayouts: service } });

const entry = (
  type: string,
  amount: number,
  createdAt: Date,
  salonId: Types.ObjectId = salon,
): void => {
  m.ledger.docs.push({ _id: new Types.ObjectId(), salonId, type, amount, createdAt });
};
interface Body {
  data: Record<string, string | null>;
  error: { code: string; details?: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const iso = (d: Date): string => d.toISOString();
const preview = (periodTo: Date): request.Test =>
  request(app).get(
    `/admin/v1/payouts/preview?salonId=${salon.toHexString()}&periodTo=${iso(periodTo)}`,
  );
const create = (periodTo: Date, body: object = {}): request.Test =>
  request(app)
    .post('/admin/v1/payouts')
    .send({ salonId: salon.toHexString(), periodTo: iso(periodTo), ...body });
const transfer = (id: string, body: object = {}): request.Test =>
  request(app)
    .post(`/admin/v1/payouts/${id}/transfer`)
    .send({
      amount: '7.300',
      transferredAt: iso(NOW),
      transferReference: 'BANK-123',
      note: 'Weekly transfer',
      ...body,
    });

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  audits.length = 0;
  notified.length = 0;
  notifierFails = false;
  m.salons.docs.push({ _id: salon, name: 'Glow' }, { _id: other, name: 'Bloom' });
  entry('CHARGE', 10_000, day(-5));
  entry('GATEWAY_FEE', -300, day(-5));
  entry('REFUND', -2_500, day(-3));
  entry('ADJUSTMENT', 100, day(-2));
  entry('CHARGE', 4_000, day(-1)); // after the period used below
  entry('CHARGE', 999, day(-5), other);
});

describe('preview', () => {
  it('adds charges, fees, refunds and adjustments up to the end of the period, in JOD', async () => {
    const res = await preview(day(-1.5));
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      gross: '10.000',
      fees: '0.300',
      refunds: '2.500',
      adjustments: '0.100',
      net: '7.300',
      periodFrom: new Date(0).toISOString(),
    });
    expect(m.payouts.docs).toHaveLength(0);
  });
  it('rejects the future, an empty period and unknown salons', async () => {
    expect(bodyOf(await preview(day(1))).error.details?.[0]?.field).toBe('periodTo');
    expect((await preview(new Date(0))).status).toBe(400);
    const missing = await request(app).get(
      `/admin/v1/payouts/preview?salonId=${new Types.ObjectId().toHexString()}&periodTo=${iso(day(-1))}`,
    );
    expect(missing.status).toBe(404);
    expect((await request(app).get('/admin/v1/payouts/preview?salonId=x&periodTo=y')).status).toBe(
      400,
    );
  });
});

describe('create and transfer', () => {
  it('creates a PENDING payout with the computed amounts and audits it', async () => {
    const res = await create(day(-1.5), { note: 'October week 1' });
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({
      status: 'PENDING',
      net: '7.300',
      gross: '10.000',
      note: 'October week 1',
    });
    expect(m.payouts.docs[0]).toMatchObject({
      net: 7_300,
      fees: 300,
      refunds: 2_500,
      adjustments: 100,
    });
    expect(audits[0]).toMatchObject({ action: 'PAYOUT_CREATE', reason: 'October week 1' });
  });
  it('only one open payout per salon', async () => {
    await create(day(-1.5));
    const again = await create(day(-1.2));
    expect(again.status).toBe(409);
    expect(m.payouts.docs).toHaveLength(1);
  });
  it('records the transfer: TRANSFERRED, ledger PAYOUT −net, balance settled, owner told', async () => {
    const id = bodyOf(await create(day(-1.5))).data['id'] ?? '';
    const res = await transfer(id);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      status: 'TRANSFERRED',
      transferReference: 'BANK-123',
      note: 'Weekly transfer',
    });
    const payoutEntry = m.ledger.docs.find((d) => d['type'] === 'PAYOUT');
    expect(payoutEntry).toMatchObject({ amount: -7_300 });
    expect(String(payoutEntry?.['payoutId'])).toBe(id);
    expect(audits.at(-1)).toMatchObject({
      action: 'PAYOUT_TRANSFER',
      reason: 'Weekly transfer',
      before: { status: 'PENDING' },
    });
    expect(notified).toEqual([id]);
    // 10 000 − 300 − 2 500 + 100 + 4 000 (after the period, still owed) − 7 300 paid
    expect((await ledger.totals(salon.toHexString())).balance).toBe(4_000);
  });
  it('a transfer is final; a wrong amount or date changes nothing; a failing notification is harmless', async () => {
    const id = bodyOf(await create(day(-1.5))).data['id'] ?? '';
    expect((await transfer(id, { amount: '7.299' })).status).toBe(400);
    expect((await transfer(id, { transferredAt: iso(day(2)) })).status).toBe(400);
    expect((await transfer(id, { note: '' })).status).toBe(400);
    expect(m.payouts.docs[0]?.['status']).toBe('PENDING');
    expect(m.ledger.docs.some((d) => d['type'] === 'PAYOUT')).toBe(false);
    notifierFails = true;
    expect((await transfer(id)).status).toBe(200);
    const again = await transfer(id);
    expect(again.status).toBe(422);
    expect(bodyOf(again).error.code).toBe('ALREADY_HANDLED');
    expect(m.ledger.docs.filter((d) => d['type'] === 'PAYOUT')).toHaveLength(1);
  });
  it('refuses a period with nothing to pay or a negative balance', async () => {
    m.ledger.docs.length = 0;
    expect((await create(day(-1))).status).toBe(400);
    entry('CHARGE', 1_000, day(-3));
    entry('REFUND', -1_500, day(-2));
    expect((await create(day(-1))).status).toBe(400);
    expect(m.payouts.docs).toHaveLength(0);
  });
  it('the next payout starts where the last one ended and never counts a payout entry', async () => {
    const first = bodyOf(await create(day(-1.5))).data;
    await transfer(first['id'] ?? '');
    // The PAYOUT entry was created "now" (real clock) and must not be paid out again.
    const next = await preview(day(0));
    expect(bodyOf(next).data).toMatchObject({
      periodFrom: first['periodTo'],
      gross: '4.000',
      net: '4.000',
    });
    expect((await preview(day(-1.6))).status).toBe(400);
    const second = await create(day(0));
    expect(second.status).toBe(201);
    expect(bodyOf(second).data['net']).toBe('4.000');
  });
});

describe('history and balances', () => {
  it('lists with filters and shows one payout; unknown ids are 404', async () => {
    const id = bodyOf(await create(day(-1.5))).data['id'] ?? '';
    const pending = await request(app).get('/admin/v1/payouts?status=PENDING');
    expect((bodyOf(pending).data as unknown as { id: string }[])[0]?.id).toBe(id);
    expect(
      bodyOf(await request(app).get('/admin/v1/payouts?status=TRANSFERRED')).data,
    ).toHaveLength(0);
    expect(
      bodyOf(await request(app).get(`/admin/v1/payouts?salonId=${other.toHexString()}`)).data,
    ).toHaveLength(0);
    expect((await request(app).get(`/admin/v1/payouts/${id}`)).status).toBe(200);
    expect(
      (await request(app).get(`/admin/v1/payouts/${new Types.ObjectId().toHexString()}`)).status,
    ).toBe(404);
  });
  it('shows each salon’s balance, what is due now and its last payout', async () => {
    const id = bodyOf(await create(day(-1.5))).data['id'] ?? '';
    await transfer(id);
    const res = await request(app).get('/admin/v1/payouts/balances');
    const rows = bodyOf(res).data as unknown as {
      name: string;
      balance: string;
      dueNow: string;
      lastPayout: { status: string; net: string } | null;
    }[];
    expect(rows.map((r) => r.name)).toEqual(['Bloom', 'Glow']);
    expect(rows[0]).toMatchObject({ balance: '0.999', dueNow: '0.999', lastPayout: null });
    expect(rows[1]).toMatchObject({
      balance: '4.000',
      dueNow: '4.000',
      lastPayout: { status: 'TRANSFERRED', net: '7.300' },
    });
  });
});
