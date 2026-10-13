import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import {
  ADMIN_PAYOUT_DETAILS_ROUTES,
  MERCHANT_PAYOUT_DETAILS_ROUTES,
} from '../../../constants/payoutDetails';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { salonParams } from '../../admin/salons/salonState.validation';
import { adminPayoutDetailsBody, ownerPayoutDetailsBody } from './payoutDetails.validation';

const masked = z.object({
  bankName: z.string(),
  accountHolderName: z.string(),
  ibanLast4: z.string().describe('The full IBAN is never returned to the app.'),
});
const failures = errorResponses(
  HTTP_STATUS.badRequest,
  HTTP_STATUS.unauthorized,
  HTTP_STATUS.forbidden,
  HTTP_STATUS.notFound,
  HTTP_STATUS.tooManyRequests,
  HTTP_STATUS.serviceUnavailable,
);
const headers = z.object({ 'Accept-Language': acceptLanguageHeader });

export const registerMerchantPayoutDetailsDocs = (registry: OpenAPIRegistry): void => {
  const path = `${API_PREFIXES.merchant}${MERCHANT_PAYOUT_DETAILS_ROUTES.base}`;
  registry.registerPath({
    method: 'get',
    path,
    tags: ['Payout details'],
    summary: 'The salon’s bank details, masked (owner only; null when none saved)',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Details', successResponseSchema(masked.nullable())),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'put',
    path,
    tags: ['Payout details'],
    summary: 'Save the bank details (owner only; needs a fresh OTP, purpose BANK_DETAILS)',
    description:
      'The IBAN is validated (ISO 13616 checksum; Jordan = 30 characters) and stored encrypted (AES-256-GCM). A wrong or expired proof is 401 `OTP_INVALID` / `OTP_EXPIRED`; a blocked number 429 `OTP_BLOCKED`; a manager is 403 `OWNER_REQUIRED`.',
    request: {
      headers,
      body: { content: { 'application/json': { schema: ownerPayoutDetailsBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Details', successResponseSchema(masked)),
      ...failures,
    },
  });
};

export const registerAdminPayoutDetailsDocs = (registry: OpenAPIRegistry): void => {
  const path = `${API_PREFIXES.admin}${ADMIN_PAYOUT_DETAILS_ROUTES.base}/{id}/payout-details`;
  registry.registerPath({
    method: 'get',
    path,
    tags: ['Payout details'],
    summary: 'A salon’s full bank details to make a transfer (every call is audited)',
    request: { headers, params: salonParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Details',
        successResponseSchema(masked.extend({ iban: z.string() }).nullable()),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'put',
    path,
    tags: ['Payout details'],
    summary:
      'Replace a salon’s bank details with a reason (audited; the audit log never holds the IBAN)',
    request: {
      headers,
      params: salonParams,
      body: { content: { 'application/json': { schema: adminPayoutDetailsBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Details', successResponseSchema(masked)),
      ...failures,
    },
  });
};
