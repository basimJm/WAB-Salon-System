import { Types } from 'mongoose';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createTableBuilders } from '../src/domain/exports/tableBuilders';
import { createAdminTransactionsService } from '../src/domain/finance/adminTransactions.service';
import { createMerchantFinanceService } from '../src/domain/finance/merchantFinance.service';
import { createLedgerService } from '../src/domain/ledger/ledger.service';
import { createRefundService } from '../src/domain/refunds/refunds.service';
import { FakePaymentProvider } from '../src/providers/payments/fake';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { LedgerRepository } from '../src/repositories/ledger.repository';
import { PayoutsRepository } from '../src/repositories/payouts.repository';
import { RefundsRepository } from '../src/repositories/refunds.repository';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-12T08:00:00Z');
const OLD = new Date('2026-10-11T08:00:00Z');
const settings = { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) };
const m = {
  tx: createFakeModel(),
  refunds: createFakeModel(),
  ledger: createFakeModel(),
  bookings: createFakeModel(),
  payouts: createFakeModel(),
};
const transactions = new TransactionsRepository(m.tx.model as never);
const refundsRepo = new RefundsRepository(m.refunds.model as never);
const gateway = new FakePaymentProvider();
const ledger = createLedgerService({
  entries: new LedgerRepository(m.ledger.model as never),
  transactions,
  refunds: refundsRepo,
  logger,
  now: () => NOW,
});
const refunds = createRefundService({
  refunds: refundsRepo,
  transactions,
  bookings: new BookingsRepository(m.bookings.model as never),
  provider: gateway,
  settings,
  audit: { record: (entry: Record<string, unknown>) => Promise.resolve(entry as never) },
  logger,
  now: () => NOW,
});
const merchant = createMerchantFinanceService({
  payoutsService: { balanceOf: () => Promise.reject(new Error('unused')) },
  transactions,
  refunds: refundsRepo,
  payouts: new PayoutsRepository(m.payouts.model as never),
  bookings: new BookingsRepository(m.bookings.model as never),
  subscriptions: { get: () => Promise.reject(new Error('unused')) },
  salons: { findById: () => Promise.resolve(null) },
  settings,
});
const admin = createAdminTransactionsService({ transactions });

const salon = new Types.ObjectId();
const abdoun = new Types.ObjectId();
const mecca = new Types.ObjectId();
const page = { page: 1, pageSize: 10 };

const paid = async (
  branchId: Types.ObjectId | undefined,
  over: Record<string, unknown> = {},
): Promise<{ bookingId: string; txId: string }> => {
  const bookingId = new Types.ObjectId();
  const txId = new Types.ObjectId();
  const session = await gateway.createSession({
    idempotencyKey: `k:${txId.toHexString()}`,
    amountFils: 10_000,
    reference: bookingId.toHexString(),
  });
  m.bookings.docs.push({
    _id: bookingId,
    salonId: salon,
    referenceNumber: `WAB-${txId.toHexString().slice(-6).toUpperCase()}`,
    refundStatus: 'NONE',
    money: { total: 10_000, dueOnline: 10_000, paidOnline: 10_000, remaining: 0, refunded: 0 },
  });
  m.tx.docs.push({
    _id: txId,
    bookingId,
    customerId: new Types.ObjectId(),
    salonId: salon,
    ...(branchId === undefined ? {} : { branchId }),
    status: 'SUCCEEDED',
    type: 'FULL',
    amount: 10_000,
    currency: 'JOD',
    attempt: 1,
    provider: 'fake',
    providerRef: session.sessionId,
    platform: 'ANDROID',
    appVersion: '1.0.0',
    createdAt: NOW,
    ...over,
  });
  return { bookingId: bookingId.toHexString(), txId: txId.toHexString() };
};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  gateway.scenarioForNextRefund('success');
});

describe('finance rows carry the booking branch (§5.14)', () => {
  it('the refund and both ledger entries take the payment’s branch', async () => {
    const { bookingId } = await paid(mecca);
    await ledger.recordChargeForBooking(bookingId);
    const refund = await refunds.requestForBooking({
      bookingId,
      amount: 4_000,
      source: 'SALON_CANCEL',
      reason: 'CANCELLED',
    });
    expect(refund?.branchId).toBe(mecca.toHexString());
    if (refund === null) throw new Error('no refund');
    await ledger.recordRefund(refund);
    expect(m.ledger.docs.map((e) => [e['type'], String(e['branchId'])])).toEqual([
      ['CHARGE', mecca.toHexString()],
      ['REFUND', mecca.toHexString()],
    ]);
  });

  it('a payment without a branch (legacy) leaves the rows without one', async () => {
    const { bookingId } = await paid(undefined);
    await ledger.recordChargeForBooking(bookingId);
    expect(m.ledger.docs[0]?.['branchId']).toBeUndefined();
  });
});

describe('filters by branch', () => {
  it('owner finance: payments and refunds narrow to one branch and show it', async () => {
    const a = await paid(abdoun);
    await paid(mecca);
    await refunds.requestForBooking({
      bookingId: a.bookingId,
      amount: 1_000,
      source: 'SALON_CANCEL',
      reason: 'CANCELLED',
    });
    const all = await merchant.transactions({
      salonId: salon.toHexString(),
      params: page,
      range: {},
    });
    expect(all.total).toBe(2);
    const one = await merchant.transactions({
      salonId: salon.toHexString(),
      params: page,
      range: {},
      branchId: mecca.toHexString(),
    });
    expect(one.items.map((t) => t.branchId)).toEqual([mecca.toHexString()]);
    const refundRows = await merchant.refunds({
      salonId: salon.toHexString(),
      params: page,
      range: {},
      branchId: abdoun.toHexString(),
    });
    expect(refundRows.items.map((r) => r.branchId)).toEqual([abdoun.toHexString()]);
    const none = await merchant.refunds({
      salonId: salon.toHexString(),
      params: page,
      range: {},
      branchId: mecca.toHexString(),
    });
    expect(none.total).toBe(0);
  });

  it('admin: transactions, refunds and reconciliation narrow to one branch', async () => {
    await paid(abdoun, { status: 'PENDING', createdAt: OLD });
    await paid(mecca, { status: 'PENDING', createdAt: OLD });
    const b = await paid(mecca);
    await refunds.requestForBooking({
      bookingId: b.bookingId,
      amount: 1_000,
      source: 'ADMIN',
      reason: 'ADMIN',
    });
    const list = await admin.list({ params: page, filter: { branchId: abdoun.toHexString() } });
    expect(list.total).toBe(1);
    const recon = await admin.reconciliation(NOW, { branchId: mecca.toHexString() });
    expect(recon.stuckPending.map((t) => t.branchId)).toEqual([mecca.toHexString()]);
    const everything = await admin.reconciliation(NOW);
    expect(everything.stuckPending).toHaveLength(2);
    const refundList = await refunds.list({ params: page, branchId: mecca.toHexString() });
    expect(refundList.total).toBe(1);
    expect((await refunds.list({ params: page, branchId: abdoun.toHexString() })).total).toBe(0);
  });

  it('the transactions export filters by branch and has a Branch column', async () => {
    await paid(abdoun);
    await paid(mecca);
    const builders = createTableBuilders({ transactions: admin } as never);
    const table = await builders.TRANSACTIONS({ branchId: mecca.toHexString() });
    expect(table.columns[2]).toBe('Branch');
    expect(table.rows.map((r) => r[2])).toEqual([mecca.toHexString()]);
  });
});
