import { Types } from 'mongoose';
import { createLedgerService } from '../src/domain/ledger/ledger.service';
import { AppendOnlyViolationError } from '../src/models/appendOnly';
import { LedgerEntryModel } from '../src/models/ledgerEntry.model';
import { LedgerRepository } from '../src/repositories/ledger.repository';
import { RefundsRepository } from '../src/repositories/refunds.repository';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-12T08:00:00Z');
const MIN = 60_000;
let clock = NOW;
const m = { ledger: createFakeModel(), tx: createFakeModel(), refunds: createFakeModel() };
const ledger = createLedgerService({
  entries: new LedgerRepository(m.ledger.model as never),
  transactions: new TransactionsRepository(m.tx.model as never),
  refunds: new RefundsRepository(m.refunds.model as never),
  logger,
  now: () => clock,
});
const salon = new Types.ObjectId();
const otherSalon = new Types.ObjectId();

const payment = (over: Record<string, unknown> = {}): { bookingId: string; txId: string } => {
  const bookingId = new Types.ObjectId();
  const _id = new Types.ObjectId();
  m.tx.docs.push({
    _id,
    bookingId,
    salonId: salon,
    customerId: new Types.ObjectId(),
    status: 'SUCCEEDED',
    amount: 10_000,
    createdAt: NOW,
    ...over,
  });
  return { bookingId: bookingId.toHexString(), txId: _id.toHexString() };
};
const refundRow = (
  txId: string,
  bookingId: string | undefined,
  amount: number,
  over: Record<string, unknown> = {},
): Parameters<typeof ledger.recordRefund>[0] => {
  const _id = new Types.ObjectId();
  const doc = {
    _id,
    transactionId: new Types.ObjectId(txId),
    salonId: salon,
    customerId: new Types.ObjectId(),
    amount,
    status: 'REFUNDED',
    completedAt: NOW,
    ...(bookingId === undefined ? {} : { bookingId: new Types.ObjectId(bookingId) }),
    ...over,
  };
  m.refunds.docs.push(doc);
  return {
    ...doc,
    id: _id.toHexString(),
    bookingId,
    transactionId: txId,
    salonId: salon.toHexString(),
  } as never;
};
const entries = (): Record<string, unknown>[] => m.ledger.docs;

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  clock = NOW;
});

describe('charges', () => {
  it('books the payment as a positive CHARGE and the gateway fee as a negative GATEWAY_FEE', async () => {
    const { bookingId, txId } = payment({ gatewayFee: 300 });
    expect(await ledger.recordChargeForBooking(bookingId)).toBe(true);
    expect(entries().map((e) => [e['type'], e['amount']])).toEqual([
      ['CHARGE', 10_000],
      ['GATEWAY_FEE', -300],
    ]);
    expect(String(entries()[0]?.['salonId'])).toBe(salon.toHexString());
    expect(String(entries()[0]?.['transactionId'])).toBe(txId);
    expect(m.tx.docs[0]?.['chargedAt']).toEqual(NOW);
  });
  it('writes no fee entry when the gateway reported none', async () => {
    const { bookingId } = payment();
    await ledger.recordChargeForBooking(bookingId);
    expect(entries().map((e) => e['type'])).toEqual(['CHARGE']);
  });
  it('is idempotent and books nothing for pay on arrival or unsuccessful payments', async () => {
    const { bookingId } = payment({ gatewayFee: 100 });
    await ledger.recordChargeForBooking(bookingId);
    expect(await ledger.recordChargeForBooking(bookingId)).toBe(false);
    expect(entries()).toHaveLength(2);
    expect(await ledger.recordChargeForBooking(new Types.ObjectId().toHexString())).toBe(false);
    const failed = payment({ status: 'FAILED' });
    expect(await ledger.recordChargeForBooking(failed.bookingId)).toBe(false);
    expect(entries()).toHaveLength(2);
  });
  it('a charge written before the marker was set is not duplicated', async () => {
    const { bookingId } = payment({ gatewayFee: 50 });
    await ledger.recordChargeForBooking(bookingId);
    delete m.tx.docs[0]?.['chargedAt'];
    await ledger.recordChargeForBooking(bookingId);
    expect(entries()).toHaveLength(2);
    expect(m.tx.docs[0]?.['chargedAt']).toEqual(NOW);
  });
});

describe('refunds', () => {
  it('books a finished refund as a negative REFUND (the fee is not returned) and marks it', async () => {
    const { bookingId, txId } = payment({ gatewayFee: 300 });
    await ledger.recordChargeForBooking(bookingId);
    const refund = refundRow(txId, bookingId, 2_500);
    expect(await ledger.recordRefund(refund)).toBe(true);
    expect(entries().at(-1)).toMatchObject({ type: 'REFUND', amount: -2_500 });
    expect(m.refunds.docs[0]?.['ledgeredAt']).toEqual(NOW);
    expect(await ledger.recordRefund(refund)).toBe(true);
    expect(entries()).toHaveLength(3);
  });
  it('a payment that never became a booking is not a movement (marked, nothing booked)', async () => {
    const { txId } = payment({ bookingId: undefined });
    delete m.tx.docs[0]?.['bookingId'];
    const refund = refundRow(txId, undefined, 10_000);
    expect(await ledger.recordRefund(refund)).toBe(false);
    expect(entries()).toHaveLength(0);
    expect(m.refunds.docs[0]?.['ledgeredAt']).toEqual(NOW);
  });
  it('a refund whose charge is not booked yet waits (not marked)', async () => {
    const { bookingId, txId } = payment();
    const refund = refundRow(txId, bookingId, 1_000);
    expect(await ledger.recordRefund(refund)).toBe(false);
    expect(m.refunds.docs[0]?.['ledgeredAt']).toBeUndefined();
  });
});

describe('balance', () => {
  it('sums charges, fees and refunds per salon', async () => {
    const a = payment({ gatewayFee: 300 });
    await ledger.recordChargeForBooking(a.bookingId);
    await ledger.recordRefund(refundRow(a.txId, a.bookingId, 2_500));
    const b = payment({ salonId: otherSalon, amount: 4_000 });
    await ledger.recordChargeForBooking(b.bookingId);
    expect(await ledger.totals(salon.toHexString())).toEqual({
      balance: 7_200,
      charges: 10_000,
      gatewayFees: -300,
      refunds: -2_500,
      payouts: 0,
      adjustments: 0,
    });
    expect((await ledger.totals(otherSalon.toHexString())).balance).toBe(4_000);
    expect((await ledger.totals(new Types.ObjectId().toHexString())).balance).toBe(0);
  });
});

describe('reconcile', () => {
  it('books payments and refunds whose ledger write was missed, only once they are old enough', async () => {
    const { bookingId, txId } = payment({ createdAt: new Date(NOW.getTime() - 10 * MIN) });
    payment({ createdAt: NOW }); // too recent: the booking flow may still be writing it
    refundRow(txId, bookingId, 1_000, { completedAt: new Date(NOW.getTime() - 10 * MIN) });
    expect(await ledger.reconcile()).toBe(2);
    expect(
      entries()
        .map((e) => e['type'])
        .sort(),
    ).toEqual(['CHARGE', 'REFUND']);
    expect(await ledger.reconcile()).toBe(0);
    clock = new Date(NOW.getTime() + 5 * MIN);
    expect(await ledger.reconcile()).toBe(1);
  });
});

describe('append-only', () => {
  it('refuses to change or delete entries', async () => {
    await expect(
      LedgerEntryModel.updateOne({}, { $set: { amount: 1 } }).exec(),
    ).rejects.toBeInstanceOf(AppendOnlyViolationError);
    await expect(LedgerEntryModel.deleteMany({}).exec()).rejects.toBeInstanceOf(
      AppendOnlyViolationError,
    );
  });
  it('only whole fils are accepted', async () => {
    const entry = new LedgerEntryModel({ salonId: salon, type: 'CHARGE', amount: 1.5 });
    await expect(entry.validate()).rejects.toHaveProperty('errors.amount');
    const ok = new LedgerEntryModel({ salonId: salon, type: 'REFUND', amount: -250 });
    await expect(ok.validate()).resolves.toBeUndefined();
  });
});
