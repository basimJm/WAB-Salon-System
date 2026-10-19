import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  ADMIN_SALON_INSIGHT_ROUTES,
  SALON_ANALYTICS_MAX_DAYS,
  SALON_DELETION_DECISIONS,
} from '../../../constants/adminSalonInsights';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { BOOKING_STATUSES } from '../../../constants/enums';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  activityQuery,
  analyticsQuery,
  deletionDecisionBody,
  salonParams,
} from './salonInsights.validation';

const statusCounts = z.object(
  Object.fromEntries(BOOKING_STATUSES.map((status) => [status, z.number().int()])) as Record<
    (typeof BOOKING_STATUSES)[number],
    z.ZodNumber
  >,
);
const kpis = z.object({
  rating: z.object({ avg: z.number(), count: z.number() }),
  bookings: z.object({
    total: z.number().int(),
    last30d: z.number().int().describe('Created in the last 30 days.'),
    byStatus: statusCounts,
    byStatus30d: statusCounts,
  }),
  activeServices: z.number().int(),
  activeStaff: z.number().int(),
});
const analytics = z.object({
  from: z.string(),
  to: z.string(),
  total: z.number().int(),
  days: z.array(z.object({ date: z.string(), bookings: z.number().int() })),
  byStatus: statusCounts,
});
const activity = z.object({
  id: z.string(),
  action: z.string(),
  adminId: z.string(),
  reason: z.string(),
  createdAt: z.iso.datetime(),
});

export const registerAdminSalonInsightsDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_SALON_INSIGHT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin salon insights'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const path = (route: string): string => `${base}${route.replace(/:(\w+)/g, '{$1}')}`;
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_SALON_INSIGHT_ROUTES.kpis),
    tags,
    summary:
      'Salon KPIs: rating, bookings by status (all time and last 30 days), active services and staff',
    request: { headers, params: salonParams },
    responses: { [HTTP_STATUS.ok]: jsonResponse('KPIs', successResponseSchema(kpis)), ...failures },
  });
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_SALON_INSIGHT_ROUTES.analytics),
    tags,
    summary: 'Bookings created per day (Asia/Amman) for a date range',
    description: `Both ends inclusive, at most ${String(SALON_ANALYTICS_MAX_DAYS)} days (400 \`VALIDATION_ERROR\` otherwise). Days without bookings are present with 0.`,
    request: { headers, params: salonParams, query: analyticsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Series', successResponseSchema(analytics)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_SALON_INSIGHT_ROUTES.activity),
    tags,
    summary:
      'What admins did to the salon (approval, offline/online, edits, deletion decision), newest first',
    request: { headers, params: salonParams, query: activityQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Activity',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(activity),
          meta: paginationMetaSchema,
        }),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_SALON_INSIGHT_ROUTES.deletionDecision),
    tags,
    summary: 'Decide the owner’s deletion request',
    description: `\`${SALON_DELETION_DECISIONS.join('` or `')}\`, with a reason. APPROVE needs no PENDING/APPROVED booking left (409 \`SCHEDULE_CONFLICT\` with the ids), then the salon goes offline and waits for the purge. REJECT clears the request and tells the owner. 422 \`INVALID_TRANSITION\` when there is no open request.`,
    request: {
      headers,
      params: salonParams,
      body: { required: true, content: { [JSON_CONTENT_TYPE]: { schema: deletionDecisionBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Decided',
        successResponseSchema(z.object({ decision: z.enum(SALON_DELETION_DECISIONS) })),
      ),
      ...failures,
    },
  });
};
