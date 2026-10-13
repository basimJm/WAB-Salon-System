import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_APP_CONFIG_ROUTES, ADMIN_CONTENT_ROUTES } from '../../../constants/adminContent';
import { API_PREFIXES } from '../../../constants/server';
import { z } from '../../../docs/zod';
import { registerCrudDocs, type CrudDocs } from '../crud/crud.openapi';
import {
  contactQuery,
  createContactSchema,
  createFaqSchema,
  createMaintenanceSchema,
  createPageSchema,
  createVersionSchema,
  faqsQuery,
  maintenanceQuery,
  pagesQuery,
  updateContactSchema,
  updateFaqSchema,
  updateMaintenanceSchema,
  updatePageSchema,
  updateVersionSchema,
  versionsQuery,
} from './content.validation';

const localized = z.object({ ar: z.string(), en: z.string() });
const app = z.enum(['CUSTOMER', 'MERCHANT']);
const platform = z.enum(['ANDROID', 'IOS']);

const admin = (path: string): string => `${API_PREFIXES.admin}${path}`;
const CONTENT_TAG = 'Admin content';
const CONFIG_TAG = 'Admin app config';

const RESOURCES: readonly CrudDocs[] = [
  {
    basePath: admin(`${ADMIN_CONTENT_ROUTES.base}${ADMIN_CONTENT_ROUTES.pages}`),
    tag: CONTENT_TAG,
    label: 'content page (privacy, terms, about)',
    entity: z.object({
      id: z.string(),
      app,
      kind: z.enum(['PRIVACY', 'TERMS', 'ABOUT']),
      body: localized,
    }),
    query: pagesQuery,
    create: createPageSchema,
    update: updatePageSchema,
  },
  {
    basePath: admin(`${ADMIN_CONTENT_ROUTES.base}${ADMIN_CONTENT_ROUTES.faqs}`),
    tag: CONTENT_TAG,
    label: 'FAQ entry',
    entity: z.object({
      id: z.string(),
      app,
      question: localized,
      answer: localized,
      order: z.number(),
    }),
    query: faqsQuery,
    create: createFaqSchema,
    update: updateFaqSchema,
  },
  {
    basePath: admin(`${ADMIN_CONTENT_ROUTES.base}${ADMIN_CONTENT_ROUTES.contactInfo}`),
    tag: CONTENT_TAG,
    label: 'contact info',
    entity: z.object({
      id: z.string(),
      app,
      phone: z.string(),
      whatsapp: z.string(),
      email: z.string(),
    }),
    query: contactQuery,
    create: createContactSchema,
    update: updateContactSchema,
  },
  {
    basePath: admin(`${ADMIN_APP_CONFIG_ROUTES.base}${ADMIN_APP_CONFIG_ROUTES.versions}`),
    tag: CONFIG_TAG,
    label: 'app version policy',
    entity: z.object({
      id: z.string(),
      app,
      platform,
      latest: z.string(),
      minSupported: z.string(),
      optionalUpdate: z.boolean(),
      storeUrl: z.string(),
    }),
    query: versionsQuery,
    create: createVersionSchema,
    update: updateVersionSchema,
  },
  {
    basePath: admin(`${ADMIN_APP_CONFIG_ROUTES.base}${ADMIN_APP_CONFIG_ROUTES.maintenance}`),
    tag: CONFIG_TAG,
    label: 'maintenance switch',
    entity: z.object({ id: z.string(), app, enabled: z.boolean(), message: localized }),
    query: maintenanceQuery,
    create: createMaintenanceSchema,
    update: updateMaintenanceSchema,
  },
];

export const registerAdminContentDocs = (registry: OpenAPIRegistry): void => {
  for (const resource of RESOURCES) registerCrudDocs(registry, resource);
};
