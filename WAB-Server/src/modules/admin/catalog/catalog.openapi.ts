import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_CATALOG_ROUTES } from '../../../constants/catalog';
import { API_PREFIXES } from '../../../constants/server';
import { z } from '../../../docs/zod';
import { registerCrudDocs } from '../crud/crud.openapi';
import { catalogAdminQuery, createCatalogSchema, updateCatalogSchema } from './catalog.validation';

const localized = z.object({ ar: z.string(), en: z.string() });

export const registerAdminCatalogDocs = (registry: OpenAPIRegistry): void => {
  registerCrudDocs(registry, {
    basePath: `${API_PREFIXES.admin}${ADMIN_CATALOG_ROUTES.base}`,
    tag: 'Admin catalog',
    label: 'catalog service',
    entity: z.object({
      id: z.string(),
      name: localized,
      description: localized,
      imageKey: z.string(),
      gender: z.enum(['MALE', 'FEMALE']),
      active: z.boolean(),
      sortOrder: z.number(),
    }),
    query: catalogAdminQuery,
    create: createCatalogSchema,
    update: updateCatalogSchema,
  });
};
