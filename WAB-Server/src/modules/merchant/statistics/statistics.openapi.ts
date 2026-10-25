import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { BOOKING_STATUSES } from '../../../constants/enums';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import { MERCHANT_STATISTICS_ROUTES } from '../../../constants/statistics';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { statisticsQuery } from './statistics.validation';

const jod = z.string().describe('JOD, 3 decimals');
const rate = z.number().nullable().describe('Percent, one decimal; null when nothing to measure');
const statistics = z.object({
  from: z.string(),
  to: z.string(),
  branchId: z.string().nullable().describe('null = the whole salon'),
  bookings: z.object({
    total: z.number(),
    byStatus: z.object(Object.fromEntries(BOOKING_STATUSES.map((s) => [s, z.number()]))),
    approvalRate: rate,
    cancellationRate: rate,
    noShowRate: rate,
    averageResponseMinutes: z.number().nullable(),
    brideBookings: z.number(),
    revenue: z.object({ online: jod, atSalon: jod, total: jod }),
  }),
  profileViews: z.number().describe('Salon page opens (shared by every branch)'),
  reviews: z.object({ new: z.number(), averageRating: z.number() }),
  days: z.array(z.object({ date: z.string(), bookings: z.number(), revenue: jod })),
  topServices: z.array(z.object({ id: z.string(), name: z.string(), bookings: z.number() })),
  topStaff: z.array(
    z.object({ id: z.string(), firstName: z.string(), bookings: z.number(), rating: z.number() }),
  ),
});

export const registerMerchantStatisticsDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES.merchant}${MERCHANT_STATISTICS_ROUTES.base}`,
    tags: ['Statistics'],
    summary:
      'KPIs, per-day series and rankings for a period of appointment days (STATISTICS_VIEW; branch members: their branch only, else 403 BRANCH_SCOPE_DENIED)',
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      query: statisticsQuery,
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Statistics', successResponseSchema(statistics)),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.forbidden,
        HTTP_STATUS.notFound,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};
