import type { RequestHandler, Router } from 'express';
import type { AdminCrudService } from '../../../domain/adminCrud/adminCrud.service';
import type { CatalogServiceRaw } from '../../../models/catalogService.model';
import { createAdminCrudRouter } from '../crud/crud.routes';
import { catalogAdminQuery, createCatalogSchema, updateCatalogSchema } from './catalog.validation';

export const createAdminCatalogRouter = (
  service: AdminCrudService<CatalogServiceRaw>,
  guard: RequestHandler,
): Router =>
  createAdminCrudRouter({
    service,
    guard,
    listQuery: catalogAdminQuery,
    createBody: createCatalogSchema,
    updateBody: updateCatalogSchema,
  });
