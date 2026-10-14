import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import { ADMIN_SUBSCRIPTION_ROUTES } from '../../../constants/subscriptions';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { recordPaymentBody, salonParams, subscriptionsQuery } from './subscriptions.validation';

const payment = z.object({
  amount: z.string().describe('JOD decimal string'),
  paidAt: z.string(),
  periodFrom: z.string(),
  periodTo: z.string(),
  method: z.string(),
  reference: z.string(),
  note: z.string().nullable(),
  recordedBy: z.string(),
});
const subscription = z.object({
  salonId: z.string(),
  salonName: z.string(),
  status: z.enum(['TRIAL', 'ACTIVE', 'EXPIRED']),
  trialEndsAt: z.string(),
  currentPeriodEnd: z.string().nullable(),
  endsAt: z.string().describe('Trial end for a trial, paid period end otherwise'),
  daysRemaining: z.number().describe('Whole days left, negative once ended'),
  lastPayment: payment.nullable(),
  payments: z.array(payment),
});

export const registerAdminSubscriptionDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_SUBSCRIPTION_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path: base,
    tags: ['Subscriptions'],
    summary: 'Subscriptions by salon (filter by status, or ending within N days)',
    request: { headers, query: subscriptionsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Subscriptions', successResponseSchema(z.array(subscription))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{salonId}`,
    tags: ['Subscriptions'],
    summary: 'One salon’s subscription with its payments',
    request: { headers, params: salonParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Subscription', successResponseSchema(subscription)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}/{salonId}/payments`,
    tags: ['Subscriptions'],
    summary:
      'Record a payment made outside the app (audited): the salon becomes ACTIVE and its paid period is extended',
    description:
      'The paid period end becomes the later of the current end and `periodTo`. The same reference twice is 409. Putting an expired salon Offline stays a manual decision (`/admin/v1/salons/{id}/offline`).',
    request: {
      headers,
      params: salonParams,
      body: { content: { 'application/json': { schema: recordPaymentBody } } },
    },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Subscription', successResponseSchema(subscription)),
      ...failures,
    },
  });
};
