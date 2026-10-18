import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { ADMIN_APPLICATION_ROUTES, SALON_STATES } from '../../../constants/salon';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { applicationParams, applicationsQuery, decisionBody } from './applications.validation';

const owner = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
});
const row = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.enum(['MALE', 'FEMALE']),
  state: z.enum(SALON_STATES),
  cityId: z.string().nullable(),
  owner: owner.nullable(),
  submittedAt: z.string(),
  resubmissionCount: z.number(),
  rejectionReason: z.string().nullable(),
});
const detail = row.extend({
  description: z.string().nullable(),
  areaId: z.string().nullable(),
  documentUrls: z.array(z.string()).describe('Signed, short-lived URLs of the private documents.'),
});

export const registerAdminApplicationDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_APPLICATION_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin applications'];
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
    summary: 'Applications queue, oldest first (pending by default)',
    request: { headers, query: applicationsQuery },
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
    summary: 'One application with signed license-document URLs',
    request: { headers, params: applicationParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Application', successResponseSchema(detail)),
      ...failures,
    },
  });
  for (const decision of ['approve', 'reject'] as const) {
    registry.registerPath({
      method: 'post',
      path: `${base}/{id}/${decision}`,
      tags,
      summary:
        decision === 'approve'
          ? 'Approve an application (reason required, audited): starts the trial subscription'
          : 'Reject an application (reason required, audited): the owner sees the reason',
      request: {
        headers,
        params: applicationParams,
        body: { required: true, content: { 'application/json': { schema: decisionBody } } },
      },
      responses: {
        [HTTP_STATUS.ok]: jsonResponse('Reviewed', successResponseSchema(row)),
        ...failures,
      },
    });
  }
};
