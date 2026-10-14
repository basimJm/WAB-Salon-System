import { Router, type RequestHandler } from 'express';
import { ADMIN_APP_CONFIG_ROUTES, ADMIN_CONTENT_ROUTES } from '../../../constants/adminContent';
import type { AdminContentServices } from '../../../domain/adminCrud/content';
import { mount } from '../../../routes/mount';
import { createAdminCrudRouter } from '../crud/crud.routes';
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

export const createAdminContentRouter = (
  services: AdminContentServices,
  guard: RequestHandler,
): Router => {
  const router = Router();
  mount(
    router,
    ADMIN_CONTENT_ROUTES.pages,
    createAdminCrudRouter({
      service: services.pages,
      guard,
      listQuery: pagesQuery,
      createBody: createPageSchema,
      updateBody: updatePageSchema,
    }),
  );
  mount(
    router,
    ADMIN_CONTENT_ROUTES.faqs,
    createAdminCrudRouter({
      service: services.faqs,
      guard,
      listQuery: faqsQuery,
      createBody: createFaqSchema,
      updateBody: updateFaqSchema,
    }),
  );
  mount(
    router,
    ADMIN_CONTENT_ROUTES.contactInfo,
    createAdminCrudRouter({
      service: services.contactInfo,
      guard,
      listQuery: contactQuery,
      createBody: createContactSchema,
      updateBody: updateContactSchema,
    }),
  );
  return router;
};

export const createAdminAppConfigRouter = (
  services: AdminContentServices,
  guard: RequestHandler,
): Router => {
  const router = Router();
  mount(
    router,
    ADMIN_APP_CONFIG_ROUTES.versions,
    createAdminCrudRouter({
      service: services.appVersions,
      guard,
      listQuery: versionsQuery,
      createBody: createVersionSchema,
      updateBody: updateVersionSchema,
    }),
  );
  mount(
    router,
    ADMIN_APP_CONFIG_ROUTES.maintenance,
    createAdminCrudRouter({
      service: services.maintenance,
      guard,
      listQuery: maintenanceQuery,
      createBody: createMaintenanceSchema,
      updateBody: updateMaintenanceSchema,
    }),
  );
  return router;
};
