import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { CONTENT_KINDS, CONTENT_ROUTES } from '../../../constants/content';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES, type ApiNamespace } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { pageParamsSchema } from './content.validation';

const registerDocs = (registry: OpenAPIRegistry, namespace: ApiNamespace): void => {
  const base = `${API_PREFIXES[namespace]}${CONTENT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const common = { tags: ['Content'], security: [] };
  registry.registerPath({
    ...common,
    method: 'get',
    path: `${base}${CONTENT_ROUTES.pages}/{slug}`,
    summary: 'Privacy policy, terms or about text',
    request: { headers, params: pageParamsSchema },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Page in the request language',
        successResponseSchema(z.object({ kind: z.enum(CONTENT_KINDS), body: z.string() })),
      ),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.notFound,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
  registry.registerPath({
    ...common,
    method: 'get',
    path: `${base}${CONTENT_ROUTES.faqs}`,
    summary: 'FAQ in admin-defined order',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Questions and answers',
        successResponseSchema(
          z.array(z.object({ id: z.string(), question: z.string(), answer: z.string() })),
        ),
      ),
      ...errorResponses(HTTP_STATUS.tooManyRequests, HTTP_STATUS.serviceUnavailable),
    },
  });
};

export const registerCustomerContentDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'customer');
};
export const registerMerchantContentDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'merchant');
};
