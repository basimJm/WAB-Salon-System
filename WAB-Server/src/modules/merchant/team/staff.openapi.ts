import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import { MERCHANT_TEAM_ROUTES } from '../../../constants/team';
import { DAYS_OF_WEEK } from '../../../constants/time';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { bookingConflictDoc } from '../../shared/salonEdit/conflict.openapi';
import { staffParams, staffProfileSchema } from './staff.validation';

const profile = successResponseSchema(
  z.object({
    memberId: z.string(),
    providesServices: z.boolean(),
    bio: z.string().nullable(),
    yearsOfExperience: z.number().nullable(),
    serviceIds: z.array(z.string()),
    brideQualified: z.boolean(),
    workingDays: z.array(
      z.object({
        day: z.enum(DAYS_OF_WEEK),
        start: z.string().nullable(),
        end: z.string().nullable(),
      }),
    ),
    rating: z.object({ avg: z.number(), count: z.number() }),
    customersCount: z.number(),
  }),
);

export const registerMerchantStaffDocs = (registry: OpenAPIRegistry): void => {
  const path = `${API_PREFIXES.merchant}${MERCHANT_TEAM_ROUTES.base}/{id}/staff`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path,
    tags: ['Staff'],
    summary: 'Staff profile of a member (STAFF_MANAGE)',
    request: { headers, params: staffParams },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Profile', profile), ...failures },
  });
  registry.registerPath({
    method: 'put',
    path,
    tags: ['Staff'],
    summary:
      'Save the staff profile: skills are salon service ids, working days are open salon days (custom hours inside the salon hours, slot-aligned), bride qualification only in women’s salons. Completeness is recomputed.',
    request: {
      headers,
      params: staffParams,
      body: { required: true, content: { 'application/json': { schema: staffProfileSchema } } },
    },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Saved', profile), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${path}/preview`,
    tags: ['Staff'],
    summary:
      'Preview a staff profile change: the upcoming PENDING/APPROVED bookings it would break (same checks as the save, nothing changes)',
    request: {
      headers,
      params: staffParams,
      body: { required: true, content: { 'application/json': { schema: staffProfileSchema } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Affected bookings',
        successResponseSchema(z.array(bookingConflictDoc)),
      ),
      ...failures,
    },
  });
};
