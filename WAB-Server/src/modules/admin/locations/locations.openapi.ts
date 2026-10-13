import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_LOCATION_ROUTES } from '../../../constants/adminCrud';
import { API_PREFIXES } from '../../../constants/server';
import { z } from '../../../docs/zod';
import { registerCrudDocs } from '../crud/crud.openapi';
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

export const registerAdminLocationDocs = (registry: OpenAPIRegistry): void => {
  for (const r of RESOURCES) {
    registerCrudDocs(registry, {
      basePath: `${API_PREFIXES.admin}${ADMIN_LOCATION_ROUTES.base}${ADMIN_LOCATION_ROUTES[r.key]}`,
      tag: 'Admin locations',
      label: r.label,
      entity: entities[r.key],
      query: r.query as z.ZodObject,
      create: r.create,
      update: r.update,
    });
  }
};
