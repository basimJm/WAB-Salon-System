import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const base = {
  bookings: { total: 120, byStatus: { APPROVED: 80, COMPLETED: 30, NO_SHOW: 10 }, bride: 12 },
  payments: {
    attempts: 100,
    succeeded: 90,
    failed: 8,
    cancelled: 2,
    collected: '4500.000',
    gatewayFees: '67.500',
  },
  refunds: { created: 6, completed: 5, failed: 1, amount: '210.000' },
  registrations: { customers: 40, applications: 3 },
  reviews: { submitted: 22 },
};
const snapshot = {
  reviewsPending: 4,
  refundsPending: 1,
  applicationsPending: 2,
  subscriptions: { trial: 5, active: 20, expired: 3 },
};
const top = [{ salonId: '64f000000000000000000001', bookings: 40, completed: 35, lost: 5 }];
const O = OPERATIONS;

export function reportsRoutes(): readonly MockRoute[] {
  return [
    mockRoute(
      defineEndpoint(O.getReportsDaily, {
        data: dto.getReportsDailyDataSchema,
        query: dto.getReportsDailyQuerySchema,
      }),
      ({ query }) => ({ data: { ...base, date: query.get('date') ?? '', snapshot } }),
    ),
    mockRoute(
      defineEndpoint(O.getReportsWeekly, {
        data: dto.getReportsWeeklyDataSchema,
        query: dto.getReportsWeeklyQuerySchema,
      }),
      ({ query }) => ({
        data: { ...base, from: query.get('from') ?? '', to: '2026-10-17', topSalons: top },
      }),
    ),
    mockRoute(
      defineEndpoint(O.getReportsMonthly, {
        data: dto.getReportsMonthlyDataSchema,
        query: dto.getReportsMonthlyQuerySchema,
      }),
      ({ query }) => ({
        data: {
          ...base,
          month: query.get('month') ?? '',
          from: '2026-10-01',
          to: '2026-10-31',
          topSalons: top,
          payouts: { count: 3, amount: '1200.000' },
          snapshot,
          growth: { bookingsPct: 12.5, collectedPct: null },
        },
      }),
    ),
  ];
}
