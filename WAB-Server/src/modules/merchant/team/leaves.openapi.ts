import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import { MERCHANT_TEAM_ROUTES } from '../../../constants/team';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { leaveParams, leavePatchSchema, leaveSchema, memberLeaveParams } from './leaves.validation';

const leave = z.object({
  id: z.string(),
  memberId: z.string(),
  from: z.string(),
  to: z.string(),
  note: z.string().nullable(),
  editable: z.boolean().describe('Only leaves that start after today can be changed or removed.'),
});

export const registerMerchantLeavesDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.merchant}${MERCHANT_TEAM_ROUTES.base}/{id}/leaves`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Staff leaves'];
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
  const body = (
    schema: z.ZodType,
  ): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
    required: true,
    content: { 'application/json': { schema } },
  });
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'Leaves of a staff member that have not ended (STAFF_MANAGE)',
    request: { headers, params: memberLeaveParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Leaves', successResponseSchema(z.array(leave))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: base,
    tags,
    summary:
      'Add a leave (salon calendar dates, `to` inclusive, not in the past). 409 SCHEDULE_CONFLICT lists affected bookings.',
    request: { headers, params: memberLeaveParams, body: body(leaveSchema) },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Added', successResponseSchema(leave)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'patch',
    path: `${base}/{leaveId}`,
    tags,
    summary: 'Change a leave that has not started',
    request: { headers, params: leaveParams, body: body(leavePatchSchema) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Saved', successResponseSchema(leave)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'delete',
    path: `${base}/{leaveId}`,
    tags,
    summary: 'Remove a leave that has not started',
    request: { headers, params: leaveParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Removed', successResponseSchema(z.null())),
      ...failures,
    },
  });
};
