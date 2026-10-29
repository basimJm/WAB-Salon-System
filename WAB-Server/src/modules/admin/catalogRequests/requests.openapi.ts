import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import {
  ADMIN_CATALOG_REQUEST_ROUTES,
  CATALOG_REQUEST_STATUSES,
  MERCHANT_CATALOG_REQUEST_ROUTES,
} from '../../../constants/salonServices';
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
  createRequestSchema,
  requestsQuery as merchantQuery,
} from '../../merchant/catalogRequests/requests.validation';
import { approveSchema, rejectSchema, requestParams, requestsQuery } from './requests.validation';

const view = z.object({
  id: z.string(),
  salonId: z.string(),
  salonName: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  imageKey: z.string().nullable(),
  status: z.enum(CATALOG_REQUEST_STATUSES),
  adminNote: z.string().nullable(),
  catalogServiceId: z.string().nullable(),
  createdAt: z.string(),
});
const page = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(view),
  meta: paginationMetaSchema,
});
const failures = errorResponses(
  HTTP_STATUS.badRequest,
  HTTP_STATUS.unauthorized,
  HTTP_STATUS.forbidden,
  HTTP_STATUS.notFound,
  HTTP_STATUS.unprocessableEntity,
  HTTP_STATUS.tooManyRequests,
  HTTP_STATUS.serviceUnavailable,
);
const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
const body = (
  schema: z.ZodType,
): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
  required: true,
  content: { 'application/json': { schema } },
});

export const registerMerchantCatalogRequestDocs = (registry: OpenAPIRegistry): void => {
  const path = `${API_PREFIXES.merchant}${MERCHANT_CATALOG_REQUEST_ROUTES.base}`;
  const tags = ['Catalog requests'];
  registry.registerPath({
    method: 'get',
    path,
    tags,
    summary: 'The salon’s catalog requests with status and admin note (SERVICES_MANAGE)',
    request: { headers, query: merchantQuery },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Requests', page), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path,
    tags,
    summary:
      'Ask the admin to add a service to the catalog (optional confirmed CATALOG_IMAGE upload)',
    request: { headers, body: body(createRequestSchema) },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Sent', successResponseSchema(view)),
      ...failures,
    },
  });
};

export const registerAdminCatalogRequestDocs = (registry: OpenAPIRegistry): void => {
  const path = `${API_PREFIXES.admin}${ADMIN_CATALOG_REQUEST_ROUTES.base}`;
  const tags = ['Admin catalog requests'];
  registry.registerPath({
    method: 'get',
    path,
    tags,
    summary: 'Catalog requests, oldest first (pending by default)',
    request: { headers, query: requestsQuery },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Requests', page), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${path}/{id}/approve`,
    tags,
    summary:
      'Approve: creates the catalog service (the salon’s business type and audience; an existing one must fit it, else 422 BUSINESS_TYPE_MISMATCH) and tells the salon (reason required, audited)',
    request: { headers, params: requestParams, body: body(approveSchema) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Approved', successResponseSchema(view)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${path}/{id}/reject`,
    tags,
    summary: 'Reject with a note the salon sees (reason required, audited)',
    request: { headers, params: requestParams, body: body(rejectSchema) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Rejected', successResponseSchema(view)),
      ...failures,
    },
  });
};
