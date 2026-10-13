import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import {
  FULL_PAYMENT_REFUND_RULES,
  MERCHANT_POLICY_ROUTES,
  NO_SHOW_DEPOSIT_RULES,
  NO_SHOW_FULL_PAYMENT_RULES,
  PAYMENT_OPTIONS,
} from '../../../constants/salon';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { policySchema } from './policy.validation';

const view = z.object({
  cancellationWindowHours: z.number(),
  paymentOptions: z.array(z.enum(PAYMENT_OPTIONS)),
  depositPercentage: z.number().nullable(),
  depositRefundableOnCustomerCancel: z.boolean(),
  fullPaymentRefundOnCustomerCancel: z.enum(FULL_PAYMENT_REFUND_RULES),
  noShowDeposit: z.enum(NO_SHOW_DEPOSIT_RULES),
  noShowFullPayment: z.enum(NO_SHOW_FULL_PAYMENT_RULES),
  notes: z.string().nullable(),
});

export const registerMerchantPolicyDocs = (registry: OpenAPIRegistry): void => {
  const path = `${API_PREFIXES.merchant}${MERCHANT_POLICY_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path,
    tags: ['Salon policy'],
    summary: 'Current policy, or null when not set yet (POLICIES_MANAGE)',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Policy', successResponseSchema(view.nullable())),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'put',
    path,
    tags: ['Salon policy'],
    summary:
      'Replace the policy (POLICIES_MANAGE). Deposit percentage (1-100) is required when DEPOSIT is offered. Applies to new bookings only (bookings keep a snapshot).',
    request: {
      headers,
      body: { required: true, content: { 'application/json': { schema: policySchema } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Saved', successResponseSchema(view)),
      ...failures,
    },
  });
};
