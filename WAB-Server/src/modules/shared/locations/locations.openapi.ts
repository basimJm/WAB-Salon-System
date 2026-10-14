import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { LOCATION_ROUTES } from '../../../constants/locations';
import { API_PREFIXES, type ApiNamespace } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { areasQuerySchema, citiesQuerySchema } from './locations.validation';

const idName = z.object({ id: z.string(), name: z.string().describe('In the request language.') });
const countries = successResponseSchema(
  z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      dialCode: z.string(),
      flagUrl: z.string(),
      phoneRegex: z.string().describe('Tested against the national number without the leading 0.'),
    }),
  ),
);

const registerDocs = (registry: OpenAPIRegistry, namespace: ApiNamespace): void => {
  const base = `${API_PREFIXES[namespace]}${LOCATION_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(HTTP_STATUS.tooManyRequests, HTTP_STATUS.serviceUnavailable);
  const common = { tags: ['Locations'], security: [] };
  registry.registerPath({
    ...common,
    method: 'get',
    path: `${base}${LOCATION_ROUTES.countries}`,
    summary: 'Active countries (flag, dial code, phone regex)',
    request: { headers },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Countries', countries), ...failures },
  });
  registry.registerPath({
    ...common,
    method: 'get',
    path: `${base}${LOCATION_ROUTES.cities}`,
    summary: 'Active cities of a country',
    request: { headers, query: citiesQuerySchema },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Cities', successResponseSchema(z.array(idName))),
      ...errorResponses(HTTP_STATUS.badRequest),
      ...failures,
    },
  });
  registry.registerPath({
    ...common,
    method: 'get',
    path: `${base}${LOCATION_ROUTES.areas}`,
    summary: 'Active areas of a city',
    request: { headers, query: areasQuerySchema },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Areas', successResponseSchema(z.array(idName))),
      ...errorResponses(HTTP_STATUS.badRequest),
      ...failures,
    },
  });
};

export const registerCustomerLocationDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'customer');
};
export const registerMerchantLocationDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'merchant');
};
