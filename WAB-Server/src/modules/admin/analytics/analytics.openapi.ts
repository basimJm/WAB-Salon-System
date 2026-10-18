import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_ANALYTICS_ROUTES } from '../../../constants/analytics';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { eventsQuery, overviewQuery } from './analytics.validation';

const counts = z.record(z.string(), z.number());

export const registerAdminAnalyticsDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_ANALYTICS_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.badGateway,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path: `${base}${ADMIN_ANALYTICS_ROUTES.overview}`,
    tags: ['Analytics'],
    summary: 'Payment, refund, booking and error event counts for a range (cached 1 minute)',
    description: 'The range may not exceed 92 days (400 on `to`).',
    request: { headers, query: overviewQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Overview',
        successResponseSchema(
          z.object({ payments: counts, refunds: counts, bookings: counts, errors: counts }),
        ),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${ADMIN_ANALYTICS_ROUTES.events}`,
    tags: ['Analytics'],
    summary: 'Event counts grouped by name or by Amman day (cached 1 minute)',
    request: { headers, query: eventsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Counts',
        successResponseSchema(z.array(z.object({ key: z.string(), count: z.number() }))),
      ),
      ...failures,
    },
  });
};
