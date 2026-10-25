import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { MERCHANT_FINANCE_ROUTES, MERCHANT_SUBSCRIPTION_ROUTES } from '../../../constants/finance';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { branchFinanceListQuery, financeListQuery } from './finance.validation';

const jod = z.string().describe('JOD decimal string');
const balance = z.object({
  balance: jod.describe('What WAB owes the salon (Σ of the ledger)'),
  dueNow: jod.describe('Pending payout amount: not yet in any payout'),
  collected: jod,
  gatewayFees: jod,
  refunds: jod,
  paidOut: jod,
  lastPayout: z
    .object({
      net: jod,
      periodTo: z.string().nullable(),
      status: z.enum(['PENDING', 'TRANSFERRED']),
    })
    .nullable(),
});
const transaction = z.object({
  id: z.string(),
  bookingId: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  type: z.enum(['DEPOSIT', 'FULL']),
  amount: jod,
  gatewayFee: jod,
  net: jod,
  branchId: z.string().nullable().describe('The branch the booking was made at'),
  createdAt: z.string(),
});
const refund = z.object({
  id: z.string(),
  bookingId: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  amount: jod,
  source: z.string(),
  reason: z.string().nullable(),
  status: z.enum(['REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED']),
  branchId: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});
const payout = z.object({
  id: z.string(),
  periodFrom: z.string().nullable(),
  periodTo: z.string().nullable(),
  gross: jod,
  fees: jod,
  refunds: jod,
  adjustments: jod,
  net: jod,
  status: z.enum(['PENDING', 'TRANSFERRED']),
  transferredAt: z.string().nullable(),
  transferReference: z.string().nullable(),
});
const subscription = z.object({
  status: z.enum(['TRIAL', 'ACTIVE', 'EXPIRED']),
  salonState: z.string(),
  trialEndsAt: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  endsAt: z.string().nullable(),
  daysRemaining: z.number(),
  endingSoon: z.boolean(),
  lastPaymentAt: z.string().nullable(),
});

export const registerMerchantFinanceDocs = (registry: OpenAPIRegistry): void => {
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.serviceUnavailable,
  );
  const base = `${API_PREFIXES.merchant}${MERCHANT_FINANCE_ROUTES.base}`;
  const get = (
    path: string,
    summary: string,
    data: z.ZodType,
    query?: typeof financeListQuery | typeof branchFinanceListQuery,
  ): void => {
    registry.registerPath({
      method: 'get',
      path,
      tags: ['Finance'],
      summary,
      request: { headers, ...(query === undefined ? {} : { query }) },
      responses: { [HTTP_STATUS.ok]: jsonResponse('OK', successResponseSchema(data)), ...failures },
    });
  };
  get(
    `${base}${MERCHANT_FINANCE_ROUTES.balance}`,
    'Balance card: pending payout amount and the last payout (FINANCE_VIEW)',
    balance,
  );
  get(
    `${base}${MERCHANT_FINANCE_ROUTES.transactions}`,
    'Online payments of the salon with gateway fee and net, newest first (FINANCE_VIEW)',
    z.array(transaction),
    branchFinanceListQuery,
  );
  get(
    `${base}${MERCHANT_FINANCE_ROUTES.refunds}`,
    'Refunds of the salon with status (FINANCE_VIEW)',
    z.array(refund),
    branchFinanceListQuery,
  );
  get(
    `${base}${MERCHANT_FINANCE_ROUTES.payouts}`,
    'Payouts: period, gross, fees, refunds, net, status, transfer date and reference (FINANCE_VIEW)',
    z.array(payout),
    financeListQuery,
  );
  get(
    `${API_PREFIXES.merchant}${MERCHANT_SUBSCRIPTION_ROUTES.base}`,
    'Salon state and subscription: trial or paid period end, days left, ending-soon flag (SUBSCRIPTION_VIEW)',
    subscription,
  );
};
