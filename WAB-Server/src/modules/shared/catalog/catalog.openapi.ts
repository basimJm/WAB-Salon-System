import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { CATALOG_ROUTES } from '../../../constants/catalog';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES, type ApiNamespace } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { catalogQuerySchema } from './catalog.module';

const item = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  gender: z.enum(['MALE', 'FEMALE']),
});

const registerDocs = (registry: OpenAPIRegistry, namespace: ApiNamespace): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES[namespace]}${CATALOG_ROUTES.base}${CATALOG_ROUTES.services}`,
    tags: ['Catalog'],
    summary: 'Active catalog services of one gender (paginated, localized)',
    security: [],
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      query: catalogQuerySchema,
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Services',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(item),
          meta: paginationMetaSchema,
        }),
      ),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};

export const registerCustomerCatalogDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'customer');
};
export const registerMerchantCatalogDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'merchant');
};
