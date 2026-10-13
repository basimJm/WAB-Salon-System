import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_CRUD_ROUTES, ADMIN_LOCATION_ROUTES } from '../../../constants/adminCrud';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  areasQuery,
  citiesQuery,
  countriesQuery,
  createAreaSchema,
  createCitySchema,
  createCountrySchema,
  updateAreaSchema,
  updateCitySchema,
  updateCountrySchema,
} from './locations.validation';

const localized = z.object({ ar: z.string(), en: z.string() });
const common = {
  id: z.string(),
  name: localized,
  active: z.boolean(),
  sortOrder: z.number(),
};
const entities = {
  countries: z.object({
    ...common,
    code: z.string(),
    dialCode: z.string(),
    flagKey: z.string(),
    phoneRegex: z.string(),
  }),
  cities: z.object({ ...common, countryCode: z.string() }),
  areas: z.object({ ...common, cityId: z.string() }),
};

interface Resource {
  readonly key: keyof typeof entities;
  readonly label: string;
  readonly query: z.ZodType;
  readonly create: z.ZodType;
  readonly update: z.ZodType;
}
const RESOURCES: readonly Resource[] = [
  {
    key: 'countries',
    label: 'country',
    query: countriesQuery,
    create: createCountrySchema,
    update: updateCountrySchema,
  },
  {
    key: 'cities',
    label: 'city',
    query: citiesQuery,
    create: createCitySchema,
    update: updateCitySchema,
  },
  {
    key: 'areas',
    label: 'area',
    query: areasQuery,
    create: createAreaSchema,
    update: updateAreaSchema,
  },
];

const failures = errorResponses(
  HTTP_STATUS.badRequest,
  HTTP_STATUS.unauthorized,
  HTTP_STATUS.forbidden,
  HTTP_STATUS.notFound,
  HTTP_STATUS.conflict,
  HTTP_STATUS.tooManyRequests,
  HTTP_STATUS.serviceUnavailable,
);

export const registerAdminLocationDocs = (registry: OpenAPIRegistry): void => {
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  for (const r of RESOURCES) {
    const base = `${API_PREFIXES.admin}${ADMIN_LOCATION_ROUTES.base}${ADMIN_LOCATION_ROUTES[r.key]}`;
    const one = successResponseSchema(entities[r.key]);
    const tags = ['Admin locations'];
    const idParams = z.object({ id: z.string() });
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
      summary: `List ${r.label} records (both languages)`,
      request: { headers, query: r.query as z.ZodObject },
      responses: {
        [HTTP_STATUS.ok]: jsonResponse('Page', successResponseSchema(z.array(entities[r.key]))),
        ...failures,
      },
    });
    registry.registerPath({
      method: 'get',
      path: `${base}${ADMIN_CRUD_ROUTES.byId.replace(':id', '{id}')}`,
      tags,
      summary: `Get one ${r.label}`,
      request: { headers, params: idParams },
      responses: { [HTTP_STATUS.ok]: jsonResponse('Record', one), ...failures },
    });
    registry.registerPath({
      method: 'post',
      path: base,
      tags,
      summary: `Create a ${r.label} (reason required, audited)`,
      request: { headers, body: body(r.create) },
      responses: { [HTTP_STATUS.created]: jsonResponse('Created', one), ...failures },
    });
    registry.registerPath({
      method: 'patch',
      path: `${base}${ADMIN_CRUD_ROUTES.byId.replace(':id', '{id}')}`,
      tags,
      summary: `Change a ${r.label}; switch it off with active=false (reason required, audited)`,
      request: { headers, params: idParams, body: body(r.update) },
      responses: { [HTTP_STATUS.ok]: jsonResponse('Updated', one), ...failures },
    });
  }
};
