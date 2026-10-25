import { Types } from 'mongoose';
import type { BookingRow } from '../src/domain/bookings/bookingQueries.service';
import {
  createMerchantDashboardService,
  type MerchantDashboardService,
} from '../src/domain/dashboard/merchantDashboard.service';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { FakeStorageProvider } from '../src/providers/storage';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { createJsonCache } from '../src/utils/redis/jsonCache';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const NOW = new Date('2026-10-12T08:00:00Z');
const salonsM = createFakeModel();
const salonId = new Types.ObjectId();
const row = (status: string, start: string, end: string): BookingRow =>
  ({
    id: `${status}-${start}`,
    status,
    appointmentStart: start,
    appointmentEnd: end,
  }) as BookingRow;
const lists: { tab: string; branchId?: string | undefined }[] = [];
const statsAsked: { from: string; to: string }[] = [];
let endingSoon = false;

const service = (cache?: ReturnType<typeof createJsonCache>): MerchantDashboardService =>
  createMerchantDashboardService({
    salons: new SalonsRepository(salonsM.model as never),
    storage: new FakeStorageProvider(),
    bookings: {
      list: ({ audience, query }) => {
        lists.push({
          tab: String(query.tab),
          branchId: audience.kind === 'MERCHANT' ? audience.member.branchId : undefined,
        });
        return Promise.resolve(
          query.tab === 'PENDING'
            ? {
                items: [row('PENDING', '2026-10-13T08:00:00.000Z', '2026-10-13T09:00:00.000Z')],
                total: 7,
              }
            : {
                items: [
                  row('COMPLETED', '2026-10-12T06:00:00.000Z', '2026-10-12T07:00:00.000Z'),
                  row('APPROVED', '2026-10-12T07:00:00.000Z', '2026-10-12T08:30:00.000Z'),
                  row('APPROVED', '2026-10-12T10:00:00.000Z', '2026-10-12T11:00:00.000Z'),
                  row('REJECTED', '2026-10-12T12:00:00.000Z', '2026-10-12T13:00:00.000Z'),
                ],
                total: 4,
              },
        );
      },
    },
    finance: {
      subscription: () =>
        Promise.resolve({
          status: 'TRIAL',
          salonState: 'LIVE',
          trialEndsAt: NOW,
          currentPeriodEnd: null,
          endsAt: new Date('2026-10-15T00:00:00Z'),
          daysRemaining: 3,
          endingSoon,
          lastPaymentAt: null,
        }),
    },
    inbox: { unreadCount: () => Promise.resolve(4) },
    statistics: {
      get: ({ from, to }) => {
        statsAsked.push({ from, to });
        return Promise.resolve({
          bookings: { total: 12, revenue: { online: 1000, atSalon: 2500, total: 3500 } },
          reviews: { new: 1, averageRating: 4.3 },
        } as never);
      },
    },
    settings: { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) },
    ...(cache === undefined ? {} : { cache }),
    now: () => NOW,
  });

const owner = {
  id: 'owner',
  permissions: ['DASHBOARD_VIEW', 'BOOKINGS_RESPOND', 'BOOKINGS_VIEW_ALL', 'STATISTICS_VIEW'],
};

beforeEach(() => {
  salonsM.docs.length = 0;
  lists.length = 0;
  statsAsked.length = 0;
  endingSoon = false;
  salonsM.docs.push({
    _id: salonId,
    name: 'Hifa',
    state: 'LIVE',
    profileKey: 'salons/p.jpg',
    completeness: { missing: [], isComplete: true },
  });
});

describe('merchant dashboard (M07, SRV-130)', () => {
  it('gathers state, unread, pending, today and the last 7 days for a full member', async () => {
    endingSoon = true;
    const d = await service().get({
      salonId: salonId.toHexString(),
      member: owner,
      language: 'en',
    });
    expect(d.salon).toMatchObject({ name: 'Hifa', state: 'LIVE', missing: [] });
    expect(d.salon.profileImageUrl).toContain('salons/p.jpg');
    expect(d.subscriptionWarning).toEqual({ endsAt: '2026-10-15T00:00:00.000Z', daysRemaining: 3 });
    expect(d.unreadNotifications).toBe(4);
    expect(d.pending?.count).toBe(7);
    // Today: one approved still to come (the 07:00 one ends at 08:30, after now) and one later.
    expect(d.today).toMatchObject({ approved: 2, completed: 1 });
    expect(d.today?.timeline.map((b) => b.appointmentStart)).toEqual([
      '2026-10-12T07:00:00.000Z',
      '2026-10-12T10:00:00.000Z',
    ]);
    expect(d.today?.next?.appointmentStart).toBe('2026-10-12T07:00:00.000Z');
    expect(d.quickStats).toEqual({ bookings: 12, revenue: '3.500', rating: 4.3 });
    expect(statsAsked).toEqual([{ from: '2026-10-06', to: '2026-10-12' }]);
  });

  it('leaves out what the member may not see and scopes to their branch', async () => {
    const employee = {
      id: 'e',
      permissions: ['DASHBOARD_VIEW', 'BOOKINGS_VIEW_OWN'],
      branchId: 'b1',
    };
    const d = await service().get({
      salonId: salonId.toHexString(),
      member: employee,
      language: 'ar',
    });
    expect(d.pending).toBeNull();
    expect(d.quickStats).toBeNull();
    expect(d.subscriptionWarning).toBeNull();
    expect(d.today).not.toBeNull();
    expect(lists).toEqual([{ tab: 'TODAY', branchId: 'b1' }]);
    const blind = { id: 'x', permissions: ['DASHBOARD_VIEW'] };
    const none = await service().get({
      salonId: salonId.toHexString(),
      member: blind,
      language: 'en',
    });
    expect(none.today).toBeNull();
  });

  it('a salon still in application has no subscription to warn about', async () => {
    salonsM.docs[0] = { ...salonsM.docs[0], state: 'APPLICATION_PENDING' };
    endingSoon = true;
    const d = await service().get({
      salonId: salonId.toHexString(),
      member: owner,
      language: 'en',
    });
    expect(d.subscriptionWarning).toBeNull();
  });

  it('serves a repeat from the short cache', async () => {
    const store = new Map<string, string>();
    const cache = createJsonCache({
      redis: {
        get: (k: string) => Promise.resolve(store.get(k) ?? null),
        set: (k: string, v: string) => {
          store.set(k, v);
          return Promise.resolve('OK');
        },
      } as never,
      logger: createLogger({ level: 'silent' }),
      prefix: 'dashboard',
      ttlSec: 15,
    });
    const s = service(cache);
    await s.get({ salonId: salonId.toHexString(), member: owner, language: 'en' });
    await s.get({ salonId: salonId.toHexString(), member: owner, language: 'en' });
    expect(lists.filter((l) => l.tab === 'TODAY')).toHaveLength(1);
    expect([...store.keys()]).toEqual(['dashboard:owner:en']);
  });
});
