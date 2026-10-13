import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { ADMIN_PAYOUT_ROUTES } from '../../../constants/payouts';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  balancesQuery,
  createPayoutBody,
  payoutParams,
  payoutsQuery,
  previewQuery,
  transferBody,
} from './payouts.validation';

const jod = z.string().describe('JOD decimal string');
const period = {
  periodFrom: z.string(),
  periodTo: z.string(),
  gross: jod,
  fees: jod,
  refunds: jod,
  adjustments: jod.describe('Signed manual corrections'),
  net: jod.describe('gross − fees − refunds + adjustments'),
};
const payout = z.object({
  id: z.string(),
  salonId: z.string(),
  ...period,
  status: z.enum(['PENDING', 'TRANSFERRED']),
  transferredAt: z.string().nullable(),
  transferReference: z.string().nullable(),
  note: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
});
const balance = z.object({
  salonId: z.string(),
  name: z.string(),
  balance: jod.describe('Σ of the ledger: what WAB owes the salon'),
  charges: jod,
  gatewayFees: jod,
  refunds: jod,
  payouts: jod,
  adjustments: jod,
  dueNow: jod.describe('Not yet in any payout'),
  lastPayout: z
    .object({ periodTo: z.string(), net: jod, status: z.enum(['PENDING', 'TRANSFERRED']) })
    .nullable(),
});

export const registerAdminPayoutDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_PAYOUT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.serviceUnavailable,
  );
  const ok = (
    name: string,
    schema: z.ZodType,
  ): Record<number, ReturnType<typeof jsonResponse>> => ({
    [HTTP_STATUS.ok]: jsonResponse(name, successResponseSchema(schema)),
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${ADMIN_PAYOUT_ROUTES.balances}`,
    tags: ['Payouts'],
    summary: 'Balance per salon: collected, gateway fees, refunds, payouts and what is due now',
    request: { headers, query: balancesQuery },
    responses: { ...ok('Balances', z.array(balance)), ...failures },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${ADMIN_PAYOUT_ROUTES.preview}`,
    tags: ['Payouts'],
    summary: 'What a payout up to a moment would contain (nothing is stored)',
    description:
      'The period starts where the salon’s previous payout ended. `periodTo` may not be in the future or before that start (400).',
    request: { headers, query: previewQuery },
    responses: { ...ok('Preview', z.object({ salonId: z.string(), ...period })), ...failures },
  });
  registry.registerPath({
    method: 'get',
    path: base,
    tags: ['Payouts'],
    summary: 'Payout history (filter by salon or status)',
    request: { headers, query: payoutsQuery },
    responses: { ...ok('Payouts', z.array(payout)), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: base,
    tags: ['Payouts'],
    summary: 'Create a PENDING payout from the ledger up to a moment (audited)',
    description:
      'One open payout per salon (409 `ALREADY_HANDLED` while one is PENDING). A period with nothing to pay (net ≤ 0) is 400 on `periodTo`.',
    request: {
      headers,
      body: { content: { 'application/json': { schema: createPayoutBody } } },
    },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Payout', successResponseSchema(payout)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{id}`,
    tags: ['Payouts'],
    summary: 'One payout',
    request: { headers, params: payoutParams },
    responses: { ...ok('Payout', payout), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}/{id}/transfer`,
    tags: ['Payouts'],
    summary:
      'Record the bank transfer: status TRANSFERRED and the ledger entry PAYOUT −net (audited)',
    description:
      'The amount must equal the payout’s net (400 `amount`); the note is the audit reason. The owner and FINANCE_VIEW members are notified.',
    request: {
      headers,
      params: payoutParams,
      body: { content: { 'application/json': { schema: transferBody } } },
    },
    responses: { ...ok('Payout', payout), ...failures },
  });
};
