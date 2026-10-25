import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { ADMIN_SALON_STATE_ROUTES, SALON_STATES } from '../../../constants/salon';
import { API_PREFIXES } from '../../../constants/server';
import { SUBSCRIPTION_STATUSES } from '../../../constants/subscriptions';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { salonParams } from './salonState.validation';
import { membersQuery } from './adminSalons.validation';
import { branchViewDoc } from '../../shared/branches/branch.openapi';
import { genderBody, salonsQuery } from './adminSalons.validation';

const row = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.enum(['MALE', 'FEMALE']),
  state: z.enum(SALON_STATES),
  cityId: z.string().nullable(),
  areaId: z.string().nullable(),
  rating: z.object({ avg: z.number(), count: z.number() }),
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES).nullable(),
  recommended: z.boolean().describe('In an active Recommended placement right now.'),
  bookings30d: z.number().int().describe('Bookings created in the last 30 days.'),
  deletionRequestedAt: z
    .string()
    .nullable()
    .describe('The owner asked to delete the salon and no decision was made yet.'),
  createdAt: z.string(),
});
const detail = row.extend({
  description: z.string().nullable(),
  phone: z.string().nullable(),
  completeness: z.object({ missing: z.array(z.string()), isComplete: z.boolean() }),
  offline: z.object({ reason: z.string(), at: z.string() }).nullable(),
  owner: z
    .object({ id: z.string(), firstName: z.string(), lastName: z.string(), phone: z.string() })
    .nullable(),
  deletionApprovedAt: z.string().nullable(),
  subscription: z
    .object({
      status: z.enum(SUBSCRIPTION_STATUSES),
      trialEndsAt: z.string(),
      currentPeriodEnd: z.string().nullable(),
    })
    .nullable(),
  branches: z.array(branchViewDoc).describe('Every branch, closed ones too, main first'),
});

export const registerAdminSalonsDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_SALON_STATE_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin salons'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'Salons: filter by state, gender, city and name; newest first',
    request: { headers, query: salonsQuery },
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
    summary: 'Salon overview: state, completeness checklist, owner, subscription summary',
    request: { headers, params: salonParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Salon', successResponseSchema(detail)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{id}/members`,
    tags,
    summary: 'All members of a salon (active or not), owner first, with role and permissions',
    request: { headers, params: salonParams, query: membersQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Members',
        successResponseSchema(
          z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              phone: z.string(),
              role: z.string(),
              active: z.boolean(),
              providesServices: z.boolean(),
              permissions: z.array(z.string()),
              branchId: z.string().nullable().describe('null for the owner (every branch)'),
            }),
          ),
        ),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'patch',
    path: `${base}/{id}/gender`,
    tags,
    summary:
      'Change the salon’s gender (admin only, reason required, audited, owner notified). Its services are switched off (they belong to the old catalog) and bride flags are cleared for a men’s salon.',
    request: {
      headers,
      params: salonParams,
      body: { required: true, content: { 'application/json': { schema: genderBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Salon', successResponseSchema(detail)),
      ...failures,
    },
  });
};
