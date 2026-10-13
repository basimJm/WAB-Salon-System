import type { RequestHandler, Router } from 'express';
import type { AdminCrudService } from '../../../domain/adminCrud/adminCrud.service';
import type { BannerRaw } from '../../../models/banner.model';
import { createAdminCrudRouter } from '../crud/crud.routes';
import { bannersQuery, createBannerSchema, updateBannerSchema } from './banners.validation';

export const createAdminBannersRouter = (
  service: AdminCrudService<BannerRaw>,
  guard: RequestHandler,
): Router =>
  createAdminCrudRouter({
    service,
    guard,
    listQuery: bannersQuery,
    createBody: createBannerSchema,
    updateBody: updateBannerSchema,
  });
