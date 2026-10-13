import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { PAYMENT_ROUTES } from '../../../constants/payments';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { paymentParams, startPaymentBody } from './payments.validation';

const payment = z.object({
  transactionId: z.string(),
  draftId: z.string().nullable(),
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED']),
  type: z.enum(['DEPOSIT', 'FULL']),
  attempt: z.number(),
  amount: z.string().describe('JOD decimal string'),
  currency: z.literal('JOD'),
  sessionId: z.string().nullable().describe('The gateway checkout session the app pays with.'),
  gatewayCode: z.string().nullable(),
  gatewayMessage: z.string().nullable(),
});

export const registerCustomerPaymentDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.customer}${PAYMENT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
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
    method: 'post',
    path: base,
    tags: ['Payments'],
    summary: 'Start (or resume) the online payment of a confirmed booking draft',
    description:
      'The draft must be unexpired and OTP-confirmed with an online payment option (else 422 `DRAFT_EXPIRED` / `OTP_INVALID` / `PAYMENT_OPTION_NOT_ALLOWED`). A running or successful attempt is returned again; after a failed or cancelled one a new attempt starts. The booking itself is created afterwards, only from a verified payment.',
    request: {
      headers,
      body: { content: { 'application/json': { schema: startPaymentBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Payment attempt', successResponseSchema(payment)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${PAYMENT_ROUTES.verify.replace(':id', '{id}')}`,
    tags: ['Payments'],
    summary:
      'Ask the server to verify the payment with the gateway (the app’s own word is never trusted)',
    request: { headers, params: paymentParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Payment attempt', successResponseSchema(payment)),
      ...failures,
    },
  });
};
