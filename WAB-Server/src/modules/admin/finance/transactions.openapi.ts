import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  ADMIN_RECONCILIATION_ROUTES,
  ADMIN_TRANSACTION_ROUTES,
} from '../../../constants/adminFinance';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { transactionParams, transactionsQuery } from './transactions.validation';

const transaction = z.object({
  id: z.string(),
  bookingDraftId: z.string().nullable(),
  bookingId: z.string().nullable(),
  customerId: z.string(),
  salonId: z.string(),
  type: z.enum(['DEPOSIT', 'FULL']),
  amount: z.string().describe('JOD decimal string'),
  currency: z.string(),
  attempt: z.number(),
  provider: z.string(),
  providerRef: z.string().nullable(),
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED']),
  gatewayCode: z.string().nullable(),
  gatewayMessage: z.string().nullable(),
  gatewayFee: z.string().nullable(),
  refundedAt: z.string().nullable(),
  chargedAt: z.string().nullable(),
  platform: z.string(),
  appVersion: z.string(),
  createdAt: z.string(),
});
const detail = transaction.extend({
  raw: z.record(z.string(), z.unknown()).nullable(),
  attempts: z.array(transaction).describe('Every attempt of the same checkout, newest first'),
});
const reconciliation = z.object({
  stuckPending: z
    .array(transaction)
    .describe('Still PENDING at the gateway after the polling delay'),
  paidWithoutBooking: z.array(transaction).describe('Paid, no booking and not refunded yet'),
  missingLedger: z.array(transaction).describe('Paid bookings without a ledger charge'),
});

export const registerAdminFinanceDocs = (registry: OpenAPIRegistry): void => {
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.serviceUnavailable,
  );
  const base = `${API_PREFIXES.admin}${ADMIN_TRANSACTION_ROUTES.base}`;
  registry.registerPath({
    method: 'get',
    path: base,
    tags: ['Finance'],
    summary:
      'Payment attempts with gateway codes (filter by status, type, salon, customer, booking, dates)',
    request: { headers, query: transactionsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Transactions', successResponseSchema(z.array(transaction))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{id}`,
    tags: ['Finance'],
    summary: 'One attempt with the raw gateway answer and all attempts of the same checkout',
    request: { headers, params: transactionParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Transaction', successResponseSchema(detail)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES.admin}${ADMIN_RECONCILIATION_ROUTES.base}`,
    tags: ['Finance'],
    summary: 'Payment problems: stuck pending, paid without booking, missing ledger charge',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Reconciliation', successResponseSchema(reconciliation)),
      ...failures,
    },
  });
};
