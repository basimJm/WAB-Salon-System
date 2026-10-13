import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { BANNER_ACTIONS, BANNER_ROUTES } from '../../../constants/banners';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { bannersQuerySchema } from './banners.module';

export const registerCustomerBannerDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES.customer}${BANNER_ROUTES.base}`,
    tags: ['Banners'],
    summary: 'Live carousel banners for the selected gender tab',
    description:
      'Public. Active banners of that audience (or both) inside their date window, in display order.',
    security: [],
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      query: bannersQuerySchema,
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Banners',
        successResponseSchema(
          z.array(
            z.object({
              id: z.string(),
              imageUrl: z.string(),
              actionType: z.enum(BANNER_ACTIONS),
              actionValue: z.string().nullable(),
            }),
          ),
        ),
      ),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};
