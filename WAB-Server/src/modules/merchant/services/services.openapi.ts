import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { MERCHANT_SERVICES_ROUTES } from '../../../constants/salonServices';
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
  addServiceSchema,
  serviceParams,
  servicesQuery,
  updateServiceSchema,
} from './services.validation';

const view = z.object({
  id: z.string(),
  catalogServiceId: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  price: z.string().describe('JOD decimal string, 3 decimals, tax inclusive.'),
  durationMinutes: z.number(),
  brideOnly: z.boolean(),
  extraDescription: z.string().nullable(),
  mediaUrls: z.array(z.string()),
  active: z.boolean(),
});

export const registerMerchantServicesDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.merchant}${MERCHANT_SERVICES_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Salon services'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const body = (
    schema: z.ZodType,
  ): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
    required: true,
    content: { 'application/json': { schema } },
  });
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'The salon’s services (SERVICES_MANAGE), paginated',
    request: { headers, query: servicesQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Services',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(view),
          meta: paginationMetaSchema,
        }),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: base,
    tags,
    summary:
      'Offer a catalog service (same gender as the salon; bride-only only in women’s salons; once per salon)',
    request: { headers, body: body(addServiceSchema) },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Added', successResponseSchema(view)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'patch',
    path: `${base}/{id}`,
    tags,
    summary:
      'Change price, duration, bride-only, description, media or switch the service off (active=false)',
    request: { headers, params: serviceParams, body: body(updateServiceSchema) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Saved', successResponseSchema(view)),
      ...failures,
    },
  });
};
