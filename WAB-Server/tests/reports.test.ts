import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { BOOKING_STATUSES, type BookingStatus } from '../src/constants/enums';
import { createReportsService, emptyFacts, sumFacts } from '../src/domain/reports/reports.service';
import {
  createMongoReportSource,
  type DailyFacts,
  type ReportSource,
} from '../src/domain/reports/reportSource';
import { requireAuth } from '../src/middlewares/auth';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { ReportsRepository } from '../src/repositories/reports.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
// 2026-10-13 12:00 UTC = 15:00 Amman, so today (Amman) is 2026-10-13.
const NOW = new Date('2026-10-13T12:00:00.000Z');
const reportsM = createFakeModel();
const dayCalls: { from: string; to: string }[] = [];
let failStore = false;

const factsFor = (bookings: number, collected = 0): DailyFacts => {
  const base = emptyFacts();
  const byStatus = { ...base.bookings.byStatus, COMPLETED: bookings } as Record<
    BookingStatus,
    number
  >;
  return {
    ...base,
    bookings: { total: bookings, byStatus, bride: 1 },
    payments: { ...base.payments, collected, succeeded: bookings > 0 ? 1 : 0, attempts: 1 },
  };
};
const source: ReportSource = {
  dayFacts: (from, to) => {
    dayCalls.push({ from: from.toISOString(), to: to.toISOString() });
    // 2 bookings, 5.000 JOD per Amman day
    return Promise.resolve(factsFor(2, 5000));
  },
  topSalons: () => Promise.resolve([{ salonId: 's1', bookings: 3, completed: 2, lost: 1 }]),
  payoutsTransferred: () => Promise.resolve({ count: 1, amount: 12_000 }),
  snapshot: () =>
    Promise.resolve({
      reviewsPending: 4,
      refundsPending: 1,
      applicationsPending: 2,
      subscriptions: { trial: 3, active: 5, expired: 1 },
    }),
};
const reports = new ReportsRepository(reportsM.model as never);
const realSave = reports.saveDaily.bind(reports);
reports.saveDaily = (date, data, at) =>
  failStore ? Promise.reject(new Error('db down')) : realSave(date, data, at);
const service = createReportsService({
  source,
  reports,
  settings: { get: (() => Promise.resolve('Asia/Amman')) as never },
  logger,
  now: () => NOW,
});
const app = createApp({
  logger,
  services: { adminGuard: requireAuth('admin', SECRET), adminReports: service },
});
const token = (type: 'ADMIN' | 'CUSTOMER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: new Types.ObjectId().toHexString(), ttlSec: 600 }).token}`;
interface Body {
  data: Record<string, unknown>;
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const get = (path: string, auth = token()): request.Test =>
  request(app).get(`/admin/v1/reports${path}`).set('Authorization', auth);

beforeEach(() => {
  reportsM.docs.length = 0;
  dayCalls.length = 0;
  failStore = false;
});

describe('fact helpers', () => {
  it('sums every figure and every status', () => {
    const total = sumFacts([factsFor(2, 5000), factsFor(3, 1000)]);
    expect(total.bookings.total).toBe(5);
    expect(total.bookings.byStatus.COMPLETED).toBe(5);
    expect(total.bookings.bride).toBe(2);
    expect(total.payments.collected).toBe(6000);
    expect(sumFacts([])).toEqual(emptyFacts());
    expect(Object.keys(emptyFacts().bookings.byStatus)).toEqual([...BOOKING_STATUSES]);
  });
});

describe('daily report', () => {
  it('needs an admin token and a real date not in the future', async () => {
    expect((await request(app).get('/admin/v1/reports/daily?date=2026-10-01')).status).toBe(401);
    expect((await get('/daily?date=2026-10-01', token('CUSTOMER'))).status).toBe(403);
    expect((await get('/daily?date=2026-02-30')).status).toBe(400);
    expect((await get('/daily?date=2026-10-14')).status).toBe(400);
  });

  it('computes a finished day over its Amman day range, stores it and reuses it', async () => {
    const res = await get('/daily?date=2026-10-01');
    expect(res.status).toBe(200);
    const data = bodyOf(res).data as {
      payments: { collected: string };
      snapshot: { reviewsPending: number };
    };
    expect(data.payments.collected).toBe('5.000');
    expect(data.snapshot.reviewsPending).toBe(4);
    // Amman is UTC+3: 2026-10-01 starts at 2026-09-30T21:00Z
    expect(dayCalls[0]).toEqual({
      from: '2026-09-30T21:00:00.000Z',
      to: '2026-10-01T21:00:00.000Z',
    });
    expect(reportsM.docs).toHaveLength(1);
    await get('/daily?date=2026-10-01');
    expect(dayCalls).toHaveLength(1);
  });

  it('today is live and never stored', async () => {
    await get('/daily?date=2026-10-13');
    await get('/daily?date=2026-10-13');
    expect(dayCalls).toHaveLength(2);
    expect(reportsM.docs).toHaveLength(0);
  });

  it('still answers when the day cannot be stored', async () => {
    failStore = true;
    expect((await get('/daily?date=2026-10-01')).status).toBe(200);
  });
});

describe('weekly report', () => {
  it('adds seven days and lists the top salons', async () => {
    const res = await get('/weekly?from=2026-10-01');
    const data = bodyOf(res).data as {
      bookings: { total: number };
      payments: { collected: string };
      to: string;
      topSalons: unknown[];
    };
    expect(data.bookings.total).toBe(14);
    expect(data.payments.collected).toBe('35.000');
    expect(data.to).toBe('2026-10-07');
    expect(data.topSalons).toHaveLength(1);
  });

  it('skips days that have not happened yet', async () => {
    const res = await get('/weekly?from=2026-10-10');
    // 10, 11, 12 stored; 13 (today) live; 14-16 not counted
    expect((bodyOf(res).data as { bookings: { total: number } }).bookings.total).toBe(8);
    expect((await get('/weekly?from=2026-10-20')).status).toBe(400);
  });
});

describe('monthly report', () => {
  it('adds the month, payouts, snapshot and growth against the previous month', async () => {
    const res = await get('/monthly?month=2026-09');
    expect(res.status).toBe(200);
    const data = bodyOf(res).data as {
      bookings: { total: number };
      from: string;
      to: string;
      payouts: { count: number; amount: string };
      growth: { bookingsPct: number | null };
    };
    expect(data.from).toBe('2026-09-01');
    expect(data.to).toBe('2026-09-30');
    expect(data.bookings.total).toBe(60);
    expect(data.payouts).toEqual({ count: 1, amount: '12.000' });
    expect(data.growth.bookingsPct).toBe(Math.round(((60 - 62) * 1000) / 62) / 10);
  });

  it('the current month counts only days up to today, growth is null without a previous month', async () => {
    const res = await get('/monthly?month=2026-10');
    expect((bodyOf(res).data as { bookings: { total: number } }).bookings.total).toBe(26);
    expect((await get('/monthly?month=2026-11')).status).toBe(400);
    expect((await get('/monthly?month=2026-13')).status).toBe(400);
  });

  it('crosses the year boundary', async () => {
    const res = await get('/monthly?month=2026-01');
    expect(res.status).toBe(200);
    expect((bodyOf(res).data as { from: string; to: string }).to).toBe('2026-01-31');
  });
});

describe('nightly aggregation', () => {
  it('stores yesterday (Amman) and refreshes it when run again', async () => {
    expect(await service.aggregateYesterday(NOW)).toBe('2026-10-12');
    expect(reportsM.docs).toHaveLength(1);
    expect(reportsM.docs[0]?.date).toBe('2026-10-12');
    await service.aggregateYesterday(NOW);
    expect(reportsM.docs).toHaveLength(1);
  });

  it('just after Amman midnight "yesterday" is the day that just ended', async () => {
    // 21:00:30Z = 00:00:30 Amman on the 14th
    expect(await service.aggregateYesterday(new Date('2026-10-13T21:00:30.000Z'))).toBe(
      '2026-10-13',
    );
  });
});

describe('Mongo report source', () => {
  it('builds the pipelines for counts, sums and top salons', async () => {
    const pipelines: unknown[][] = [];
    const rowsFor = (p: unknown[]): unknown[] => {
      const json = JSON.stringify(p);
      if (json.includes('"$sort"')) return [{ _id: 's9', bookings: 5, completed: 3, lost: 1 }];
      if (json.includes('"sum"')) return [{ sum: 7 }];
      return [{ _id: 'COMPLETED', count: 2 }];
    };
    const model = {
      aggregate: (p: unknown[]) => {
        pipelines.push(p);
        return { exec: () => Promise.resolve(rowsFor(p)) };
      },
      countDocuments: () => ({ exec: () => Promise.resolve(3) }),
    };
    const bookings = new BookingsRepository(model as never);
    const top = await bookings.topSalons(new Date(0), new Date(1), 5);
    expect(top).toEqual([{ salonId: 's9', bookings: 5, completed: 3, lost: 1 }]);
    expect(JSON.stringify(pipelines[0])).toContain('"$limit":5');
    expect(await bookings.sumField({}, 'x')).toBe(7);
    expect(await bookings.countBy({}, 'status')).toEqual({ COMPLETED: 2 });
    const src = createMongoReportSource({
      bookings,
      transactions: bookings as never,
      refunds: bookings as never,
      customers: bookings as never,
      salons: bookings as never,
      reviews: bookings as never,
      subscriptions: bookings as never,
      payouts: bookings as never,
    });
    const facts = await src.dayFacts(new Date(0), new Date(1));
    expect(facts.bookings.byStatus.COMPLETED).toBe(2);
    expect(facts.bookings.byStatus.PENDING).toBe(0);
    expect(facts.payments.collected).toBe(7);
    expect(facts.registrations.customers).toBe(3);
    expect(Object.keys(facts.bookings.byStatus)).toHaveLength(BOOKING_STATUSES.length);
  });
});
