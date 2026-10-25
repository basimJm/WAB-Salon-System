import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { MERCHANT_DASHBOARD_ROUTES } from '../../../constants/dashboard';
import { HTTP_STATUS } from '../../../constants/http';
import { SALON_STATES } from '../../../constants/salon';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { bookingRowDoc } from '../../shared/bookings/bookingQuery.openapi';

const dashboard = z.object({
  salon: z.object({
    id: z.string(),
    name: z.string(),
    profileImageUrl: z.string().nullable(),
    state: z.enum(SALON_STATES),
    missing: z.array(z.string()).describe('What the setup checklist still needs'),
  }),
  subscriptionWarning: z
    .object({ endsAt: z.string(), daysRemaining: z.number() })
    .nullable()
    .describe('Set while the trial or subscription ends within the warning window'),
  unreadNotifications: z.number(),
  pending: z
    .object({ count: z.number(), items: z.array(bookingRowDoc) })
    .nullable()
    .describe('BOOKINGS_RESPOND only'),
  today: z
    .object({
      approved: z.number(),
      completed: z.number(),
      next: bookingRowDoc.nullable(),
      timeline: z.array(bookingRowDoc),
    })
    .nullable()
    .describe('BOOKINGS_VIEW_ALL / BOOKINGS_VIEW_OWN (own bookings only)'),
  quickStats: z
    .object({ bookings: z.number(), revenue: z.string(), rating: z.number() })
    .nullable()
    .describe('STATISTICS_VIEW only: the last 7 days'),
});

export const registerMerchantDashboardDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES.merchant}${MERCHANT_DASHBOARD_ROUTES.base}`,
    tags: ['Dashboard'],
    summary:
      'Home screen in one call (DASHBOARD_VIEW): salon state, subscription warning, unread count, pending requests, today and quick stats, scoped to the member’s permissions and branch; cached a few seconds',
    request: { headers: z.object({ 'Accept-Language': acceptLanguageHeader }) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Dashboard', successResponseSchema(dashboard)),
      ...errorResponses(
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.forbidden,
        HTTP_STATUS.notFound,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};
