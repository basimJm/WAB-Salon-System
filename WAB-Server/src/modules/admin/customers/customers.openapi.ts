import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_CUSTOMER_ROUTES } from '../../../constants/adminCustomers';
import { CUSTOMER_STATUSES, GENDERS } from '../../../constants/enums';
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
import { customerParams, customersQuery, reasonBody } from './customers.validation';

const row = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  gender: z.enum(GENDERS),
  cityId: z.string(),
  status: z.enum(CUSTOMER_STATUSES),
  registeredAt: z.string(),
  lastActiveAt: z.string().nullable(),
  bookingsCount: z.number(),
});
const detail = row.extend({
  email: z.string(),
  areaId: z.string(),
  language: z.string(),
  pushEnabled: z.boolean(),
  blockedReason: z.string().nullable(),
  blockedAt: z.string().nullable(),
  deletionScheduledAt: z.string().nullable(),
  journeyUserId: z.string(),
  devices: z.array(
    z.object({
      app: z.string(),
      platform: z.string(),
      appVersion: z.string(),
      lastSeenAt: z.string(),
      pushToken: z.boolean(),
    }),
  ),
});

export const registerAdminCustomerDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_CUSTOMER_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin customers'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const body = { content: { 'application/json': { schema: reasonBody } } };
  const done = {
    [HTTP_STATUS.ok]: jsonResponse(
      'Done (deletion returns `deletionScheduledAt`)',
      successResponseSchema(z.object({ deletionScheduledAt: z.string().optional() }).nullable()),
    ),
  };
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'Customers: search by name or phone, filter by status, gender and city',
    request: { headers, query: customersQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Page',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(row),
          meta: paginationMetaSchema,
        }),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{id}`,
    tags,
    summary: 'Customer detail with devices and the id for the journey view',
    request: { headers, params: customerParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Customer', successResponseSchema(detail)),
      ...failures,
    },
  });
  for (const [path, summary] of [
    ['block', 'Block an account (reason, audit); all sessions end'],
    ['unblock', 'Unblock an account'],
    ['delete', 'Start the deletion grace period of an active account'],
    ['restore', 'Restore an account that waits for deletion'],
  ] as const) {
    registry.registerPath({
      method: 'post',
      path: `${base}/{id}/${path}`,
      tags,
      summary,
      request: { headers, params: customerParams, body },
      responses: { ...done, ...failures },
    });
  }
};
