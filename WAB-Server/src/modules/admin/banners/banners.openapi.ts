import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_BANNER_ROUTES, BANNER_ACTIONS, BANNER_AUDIENCES } from '../../../constants/banners';
import { API_PREFIXES } from '../../../constants/server';
import { z } from '../../../docs/zod';
import { registerCrudDocs } from '../crud/crud.openapi';
import { bannersQuery, createBannerSchema, updateBannerSchema } from './banners.validation';

const localized = z.object({ ar: z.string(), en: z.string() });

export const registerAdminBannerDocs = (registry: OpenAPIRegistry): void => {
  registerCrudDocs(registry, {
    basePath: `${API_PREFIXES.admin}${ADMIN_BANNER_ROUTES.base}`,
    tag: 'Admin banners',
    label: 'banner',
    entity: z.object({
      id: z.string(),
      imageKey: localized,
      action: z.enum(BANNER_ACTIONS),
      actionValue: z.string().optional(),
      gender: z.enum(BANNER_AUDIENCES),
      startAt: z.string(),
      endAt: z.string(),
      order: z.number(),
      active: z.boolean(),
    }),
    query: bannersQuery,
    create: createBannerSchema,
    update: updateBannerSchema,
  });
};
