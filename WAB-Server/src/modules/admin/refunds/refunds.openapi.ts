import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { ADMIN_REFUND_ROUTES } from '../../../constants/refunds';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { manualBody, refundParams, refundsQuery, retryBody } from './refunds.validation';

const refund = z.object({
  id: z.string(),
  bookingId: z
    .string()
    .nullable()
    .describe('Null when no booking was created (slot lost after payment).'),
  transactionId: z.string(),
  salonId: z.string(),
  customerId: z.string(),
  amount: z.string().describe('JOD decimal string'),
  source: z.enum([
    'SALON_REJECT',
    'SALON_CANCEL',
    'AUTO_CANCEL',
    'CUSTOMER_CANCEL',
    'NO_SHOW_POLICY',
    'ADMIN',
  ]),
  reason: z.string().nullable(),
  status: z.enum(['REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED']),
  attempts: z.number(),
  lastError: z.string().nullable(),
  nextAttemptAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  manual: z.object({ by: z.string(), reference: z.string() }).nullable(),
  createdAt: z.string(),
});

export const registerAdminRefundDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_REFUND_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path: base,
    tags: ['Refunds'],
    summary: 'Refunds, newest first (filter by status or booking)',
    request: { headers, query: refundsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Refunds', successResponseSchema(z.array(refund))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{id}`,
    tags: ['Refunds'],
    summary: 'One refund with its attempts',
    request: { headers, params: refundParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Refund', successResponseSchema(refund)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}/{id}/retry`,
    tags: ['Refunds'],
    summary: 'Give a failed refund a fresh set of attempts (reason required, audited)',
    request: {
      headers,
      params: refundParams,
      body: { content: { 'application/json': { schema: retryBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Refund', successResponseSchema(refund)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}/{id}/manual`,
    tags: ['Refunds'],
    summary:
      'Mark a pending or failed refund as refunded outside the gateway (reference and reason required, audited)',
    request: {
      headers,
      params: refundParams,
      body: { content: { 'application/json': { schema: manualBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Refund', successResponseSchema(refund)),
      ...failures,
    },
  });
};
