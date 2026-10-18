import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { BOOKING_STATUSES } from '../../../constants/enums';
import { HTTP_STATUS } from '../../../constants/http';
import { ADMIN_REPORT_ROUTES } from '../../../constants/reports';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { dailyQuery, monthlyQuery, weeklyQuery } from './reports.validation';

const jod = z.string().describe('JOD decimal string');
const facts = {
  bookings: z.object({
    total: z.number(),
    byStatus: z.record(z.enum(BOOKING_STATUSES), z.number()),
    bride: z.number(),
  }),
  payments: z.object({
    attempts: z.number(),
    succeeded: z.number(),
    failed: z.number(),
    cancelled: z.number(),
    collected: jod,
    gatewayFees: jod,
  }),
  refunds: z.object({
    created: z.number(),
    completed: z.number(),
    failed: z.number(),
    amount: jod,
  }),
  registrations: z.object({ customers: z.number(), applications: z.number() }),
  reviews: z.object({ submitted: z.number() }),
};
const topSalons = z.array(
  z.object({ salonId: z.string(), bookings: z.number(), completed: z.number(), lost: z.number() }),
);
const snapshot = z.object({
  reviewsPending: z.number(),
  refundsPending: z.number(),
  applicationsPending: z.number(),
  subscriptions: z.object({ trial: z.number(), active: z.number(), expired: z.number() }),
});

export const registerAdminReportDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_REPORT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.serviceUnavailable,
  );
  const ok = (
    name: string,
    schema: z.ZodType,
  ): Record<number, ReturnType<typeof jsonResponse>> => ({
    [HTTP_STATUS.ok]: jsonResponse(name, successResponseSchema(schema)),
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${ADMIN_REPORT_ROUTES.daily}`,
    tags: ['Reports'],
    summary: 'One business day (Asia/Amman): bookings, payments, refunds, registrations, reviews',
    description:
      'Finished days come from the nightly aggregate (computed once if missing); today is live. Installs, active users, funnels and retention need BigQuery (SRV-110) and are not included.',
    request: { headers, query: dailyQuery },
    responses: {
      ...ok('Daily', z.object({ date: z.string(), ...facts, snapshot })),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${ADMIN_REPORT_ROUTES.weekly}`,
    tags: ['Reports'],
    summary: 'Seven days from `from`: the daily numbers added up plus top salons',
    request: { headers, query: weeklyQuery },
    responses: {
      ...ok('Weekly', z.object({ from: z.string(), to: z.string(), ...facts, topSalons })),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${ADMIN_REPORT_ROUTES.monthly}`,
    tags: ['Reports'],
    summary:
      'One month: weekly content, payouts transferred, subscriptions, growth vs previous month',
    request: { headers, query: monthlyQuery },
    responses: {
      ...ok(
        'Monthly',
        z.object({
          month: z.string(),
          from: z.string(),
          to: z.string(),
          ...facts,
          topSalons,
          payouts: z.object({ count: z.number(), amount: jod }),
          snapshot,
          growth: z.object({
            bookingsPct: z.number().nullable(),
            collectedPct: z.number().nullable(),
          }),
        }),
      ),
      ...failures,
    },
  });
};
