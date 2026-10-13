import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { MERCHANT_SALON_ROUTES, SALON_STATES } from '../../../constants/salon';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { applySchema, resubmitSchema } from './salon.validation';

const status = z.object({
  salonId: z.string(),
  state: z.enum(SALON_STATES),
  submittedAt: z.string(),
  resubmissionCount: z.number(),
  rejectionReason: z.string().nullable(),
});
const session = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.string(),
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.string(),
  member: z.looseObject({ id: z.string(), salonId: z.string(), role: z.string() }),
  application: status,
});

export const registerMerchantSalonDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.merchant}${MERCHANT_SALON_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Salon application'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'post',
    path: `${base}${MERCHANT_SALON_ROUTES.apply}`,
    tags,
    summary: 'Apply with a new salon (creates the owner, signs them in)',
    description:
      'Public. The phone is proven by a Firebase ID token. The salon waits for admin approval; license documents are private storage keys.',
    security: [],
    request: {
      headers,
      body: { required: true, content: { 'application/json': { schema: applySchema } } },
    },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Application sent', successResponseSchema(session)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${MERCHANT_SALON_ROUTES.application}`,
    tags,
    summary: 'State of the salon application (owner)',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Status', successResponseSchema(status)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${MERCHANT_SALON_ROUTES.resubmit}`,
    tags,
    summary: 'Send a rejected application again (owner)',
    request: {
      headers,
      body: { required: false, content: { 'application/json': { schema: resubmitSchema } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Status', successResponseSchema(status)),
      ...failures,
    },
  });
};
