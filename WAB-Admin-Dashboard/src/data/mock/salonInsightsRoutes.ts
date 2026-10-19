import { defineEndpoint } from '../api/endpoint';
import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const O = OPERATIONS;
const STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SALON',
  'AUTO_CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;
const counts = (completed: number, pending: number) =>
  Object.fromEntries(
    STATUSES.map((s) => [s, s === 'COMPLETED' ? completed : s === 'PENDING' ? pending : 0]),
  ) as Record<(typeof STATUSES)[number], number>;

/** KPIs, analytics, admin activity and the deletion-request decision of a salon (mock). */
export function salonInsightsRoutes(): readonly MockRoute[] {
  return [
    mockRoute(
      defineEndpoint(O.getSalonsByIdKpis, { data: dto.getSalonsByIdKpisDataSchema }),
      () => ({
        data: {
          rating: { avg: 4.5, count: 12 },
          bookings: { total: 40, last30d: 10, byStatus: counts(30, 4), byStatus30d: counts(7, 2) },
          activeServices: 6,
          activeStaff: 3,
        },
      }),
    ),
    mockRoute(
      defineEndpoint(O.getSalonsByIdAnalytics, {
        data: dto.getSalonsByIdAnalyticsDataSchema,
        query: dto.getSalonsByIdAnalyticsQuerySchema,
      }),
      ({ query }) => ({
        data: {
          from: query.get('from') ?? '',
          to: query.get('to') ?? '',
          total: 5,
          days: [
            { date: query.get('from') ?? '', bookings: 2 },
            { date: query.get('to') ?? '', bookings: 3 },
          ],
          byStatus: counts(3, 2),
        },
      }),
    ),
    mockRoute(
      defineEndpoint(O.getSalonsByIdActivity, {
        data: dto.getSalonsByIdActivityDataSchema,
        query: dto.getSalonsByIdActivityQuerySchema,
      }),
      () => ({
        data: [
          {
            id: '64l000000000000000000001',
            action: 'SALON_HOURS_EDIT',
            adminId: '64a000000000000000000001',
            reason: 'Owner asked',
            createdAt: '2026-10-12T08:00:00.000Z',
          },
        ],
        meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
        empty: [],
      }),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdDeletionRequestDecision, {
        data: dto.postSalonsByIdDeletionRequestDecisionDataSchema,
        body: dto.postSalonsByIdDeletionRequestDecisionBodySchema,
      }),
      ({ body }) => ({ data: { decision: (body as { decision: 'APPROVE' | 'REJECT' }).decision } }),
    ),
  ];
}
