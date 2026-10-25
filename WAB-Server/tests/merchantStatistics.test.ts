import { Types } from 'mongoose';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createMerchantStatisticsService } from '../src/domain/statistics/merchantStatistics.service';
import { bookingKpis, daySeries, rankings } from '../src/domain/statistics/statistics';
import { statisticsQuery } from '../src/modules/merchant/statistics/statistics.validation';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { ReviewsRepository } from '../src/repositories/reviews.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { ServerEventsRepository } from '../src/repositories/serverEvents.repository';
import { createFakeModel } from './helpers/fakeModel';

const salonId = new Types.ObjectId();
const abdoun = new Types.ObjectId();
const mecca = new Types.ObjectId();
const lina = new Types.ObjectId();
const rana = new Types.ObjectId();
const cut = new Types.ObjectId();
const color = new Types.ObjectId();
const s = (id: Types.ObjectId): string => id.toHexString();
// 2026-10-12 is a Monday; Amman is UTC+3.
const at = (iso: string): Date => new Date(iso);

const m = {
  bookings: createFakeModel(),
  reviews: createFakeModel(),
  salons: createFakeModel(),
  members: createFakeModel(),
  events: createFakeModel(),
};
const service = createMerchantStatisticsService({
  bookings: new BookingsRepository(m.bookings.model as never),
  reviews: new ReviewsRepository(m.reviews.model as never),
  salons: new SalonsRepository(m.salons.model as never),
  members: new MembersRepository(m.members.model as never),
  events: new ServerEventsRepository(m.events.model as never),
  settings: { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) },
});

const booking = (over: {
  status: string;
  start: string;
  branchId?: Types.ObjectId;
  staffId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  money?: Record<string, number>;
  hasBride?: boolean;
  answered?: { status: string; at: string };
}): Record<string, unknown> => ({
  _id: new Types.ObjectId(),
  salonId,
  branchId: over.branchId ?? abdoun,
  status: over.status,
  appointmentStart: at(over.start),
  createdAt: at('2026-10-10T08:00:00Z'),
  hasBride: over.hasBride ?? false,
  statusHistory: [
    { status: 'PENDING', actorType: 'CUSTOMER', at: at('2026-10-10T08:00:00Z') },
    ...(over.answered === undefined
      ? []
      : [{ status: over.answered.status, actorType: 'MEMBER', at: at(over.answered.at) }]),
  ],
  money: {
    total: 10_000,
    dueOnline: 0,
    paidOnline: 0,
    remaining: 10_000,
    refunded: 0,
    ...over.money,
  },
  persons: [
    {
      name: 'P',
      staffId: over.staffId ?? lina,
      services: [
        {
          salonServiceId: over.serviceId ?? cut,
          name: {
            ar: over.serviceId === color ? 'صبغة' : 'قص',
            en: over.serviceId === color ? 'Color' : 'Cut',
          },
          price: 10_000,
          durationMinutes: 30,
        },
      ],
    },
  ],
});

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  m.salons.docs.push({ _id: salonId, name: 'Hifa', rating: { avg: 4.2, count: 10 } });
  m.members.docs.push(
    { _id: lina, salonId, firstName: 'Lina', staff: { rating: { avg: 4.5, count: 2 } } },
    { _id: rana, salonId, firstName: 'Rana', staff: { rating: { avg: 3, count: 1 } } },
  );
  m.bookings.docs.push(
    booking({
      status: 'COMPLETED',
      start: '2026-10-12T09:00:00Z',
      money: { paidOnline: 3_000, remaining: 7_000 },
      answered: { status: 'APPROVED', at: '2026-10-10T08:30:00Z' },
    }),
    booking({
      status: 'REJECTED',
      start: '2026-10-12T10:00:00Z',
      answered: { status: 'REJECTED', at: '2026-10-10T09:30:00Z' },
    }),
    booking({
      status: 'NO_SHOW',
      start: '2026-10-13T10:00:00Z',
      hasBride: true,
      answered: { status: 'APPROVED', at: '2026-10-10T08:15:00Z' },
    }),
    booking({
      status: 'CANCELLED_BY_CUSTOMER',
      start: '2026-10-13T11:00:00Z',
      money: { paidOnline: 5_000, refunded: 5_000 },
    }),
    booking({
      status: 'APPROVED',
      start: '2026-10-13T12:00:00Z',
      branchId: mecca,
      staffId: rana,
      serviceId: color,
      money: { paidOnline: 10_000, remaining: 0 },
      answered: { status: 'APPROVED', at: '2026-10-10T09:00:00Z' },
    }),
    // Outside the period.
    booking({ status: 'COMPLETED', start: '2026-10-20T09:00:00Z' }),
  );
  m.reviews.docs.push(
    {
      _id: new Types.ObjectId(),
      salonId,
      target: 'SALON',
      branchId: mecca,
      rating: 2,
      status: 'APPROVED',
      createdAt: at('2026-10-12T12:00:00Z'),
    },
    {
      _id: new Types.ObjectId(),
      salonId,
      target: 'SALON',
      branchId: mecca,
      rating: 5,
      status: 'APPROVED',
      createdAt: at('2026-09-01T12:00:00Z'),
    },
  );
  m.events.docs.push(
    {
      _id: new Types.ObjectId(),
      name: 'salon.viewed',
      salonId,
      ts: at('2026-10-12T12:00:00Z'),
      actorType: 'CUSTOMER',
      params: {},
    },
    {
      _id: new Types.ObjectId(),
      name: 'salon.viewed',
      salonId,
      ts: at('2026-10-13T12:00:00Z'),
      actorType: 'CUSTOMER',
      params: {},
    },
    {
      _id: new Types.ObjectId(),
      name: 'salon.viewed',
      salonId,
      ts: at('2026-11-13T12:00:00Z'),
      actorType: 'CUSTOMER',
      params: {},
    },
  );
});

describe('merchant statistics (M21, SRV-132)', () => {
  it('KPIs over the period: statuses, rates, response time, brides and revenue', async () => {
    const stats = await service.get({
      salonId: s(salonId),
      member: {},
      from: '2026-10-12',
      to: '2026-10-13',
      language: 'en',
    });
    expect(stats.branchId).toBeNull();
    expect(stats.bookings).toMatchObject({
      total: 5,
      approvalRate: 75,
      cancellationRate: 20,
      noShowRate: 50,
      averageResponseMinutes: 49,
      brideBookings: 1,
      revenue: { online: 13_000, atSalon: 7_000, total: 20_000 },
    });
    expect(stats.bookings.byStatus.COMPLETED).toBe(1);
    expect(stats.profileViews).toBe(2);
    expect(stats.reviews).toEqual({ new: 1, averageRating: 4.2 });
    expect(stats.days).toEqual([
      { date: '2026-10-12', bookings: 2, revenue: 10_000 },
      { date: '2026-10-13', bookings: 3, revenue: 10_000 },
    ]);
    // A tie keeps a stable order (by id).
    expect(stats.topServices).toEqual([
      { id: s(cut), name: 'Cut', bookings: 1 },
      { id: s(color), name: 'Color', bookings: 1 },
    ]);
    expect(stats.topStaff.map((x) => [x.firstName, x.rating])).toEqual([
      ['Lina', 4.5],
      ['Rana', 3],
    ]);
  });

  it('a branch member gets their branch only; another branch is refused', async () => {
    const stats = await service.get({
      salonId: s(salonId),
      member: { branchId: s(mecca) },
      from: '2026-10-12',
      to: '2026-10-13',
      language: 'ar',
    });
    expect(stats.branchId).toBe(s(mecca));
    expect(stats.bookings.total).toBe(1);
    expect(stats.topServices).toEqual([{ id: s(color), name: 'صبغة', bookings: 1 }]);
    expect(stats.reviews).toEqual({ new: 1, averageRating: 3.5 });
    await expect(
      service.get({
        salonId: s(salonId),
        member: { branchId: s(mecca) },
        branchId: s(abdoun),
        from: '2026-10-12',
        to: '2026-10-13',
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });
  });

  it('the owner can pick a branch', async () => {
    const stats = await service.get({
      salonId: s(salonId),
      member: {},
      branchId: s(abdoun),
      from: '2026-10-12',
      to: '2026-10-13',
      language: 'en',
    });
    expect(stats.bookings.total).toBe(4);
  });
});

describe('statistics helpers and query', () => {
  it('rates are null when there is nothing to measure', () => {
    const empty = bookingKpis([]);
    expect(empty).toMatchObject({
      approvalRate: null,
      cancellationRate: null,
      noShowRate: null,
      averageResponseMinutes: null,
    });
    expect(daySeries([], ['2026-10-12'], 'Asia/Amman')).toEqual([
      { date: '2026-10-12', bookings: 0, revenue: 0 },
    ]);
    expect(rankings([])).toEqual({ services: [], staff: [] });
  });

  it('the period is required, ordered and at most the maximum length', () => {
    expect(statisticsQuery.safeParse({ from: '2026-10-12', to: '2026-10-13' }).success).toBe(true);
    expect(statisticsQuery.safeParse({ from: '2026-10-13', to: '2026-10-12' }).success).toBe(false);
    expect(statisticsQuery.safeParse({ from: '2026-01-01', to: '2026-12-31' }).success).toBe(false);
    expect(statisticsQuery.safeParse({ from: '2026-10-12' }).success).toBe(false);
  });
});
