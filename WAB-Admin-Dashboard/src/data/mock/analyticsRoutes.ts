import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const O = OPERATIONS;

export function analyticsRoutes(): readonly MockRoute[] {
  return [
    mockRoute(
      defineEndpoint(O.getAnalyticsOverview, {
        data: dto.getAnalyticsOverviewDataSchema,
        query: dto.getAnalyticsOverviewQuerySchema,
      }),
      ({ query }) => {
        const half = query.get('from') === '2026-09-01T00:00:00.000Z';
        return {
          data: {
            payments: { 'payment.succeeded': half ? 40 : 60, 'payment.failed': half ? 5 : 4 },
            refunds: { 'refund.completed': 3 },
            bookings: { 'booking.created': half ? 80 : 100, 'booking.cancelled': 10 },
            errors: { 'api.error': 2 },
          },
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.getAnalyticsEvents, {
        data: dto.getAnalyticsEventsDataSchema,
        query: dto.getAnalyticsEventsQuerySchema,
      }),
      ({ query }) => {
        if (query.get('groupBy') === 'DAY')
          return {
            data: [
              { key: '2026-10-01', count: 10 },
              { key: '2026-10-02', count: 14 },
              { key: '2026-10-03', count: 9 },
            ],
          };
        return {
          data: [
            { key: 'booking.created', count: 100 },
            { key: 'booking.cancelled', count: 10 },
            { key: 'payment.succeeded', count: 60 },
            { key: 'payment.failed', count: 4 },
            { key: 'refund.completed', count: 3 },
            { key: 'api.error', count: 2 },
          ],
        };
      },
    ),
  ];
}
