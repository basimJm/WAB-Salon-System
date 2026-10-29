import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { CATALOG_ROUTES } from '../../../constants/catalog';
import { BUSINESS_TYPES, GENDERS } from '../../../constants/enums';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import type { CatalogService } from '../../../domain/catalog';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { paginationQuery } from '../../../utils/pagination';
import { sendPaginated } from '../../../utils/response/successResponse';

export const catalogQuerySchema = paginationQuery(APP_PAGE_SIZE).extend({
  /** Only services of this business type (§5.19); omitted = every type. */
  businessType: z.enum(BUSINESS_TYPES).optional(),
  /** Only services a customer of this gender sees (own audience + BOTH); omitted = every audience. */
  gender: z.enum(GENDERS).optional(),
});

/**
 * Public `GET <namespace>/catalog/services?businessType=&gender=&page=&pageSize=`. Customers browse it, salons
 * pick from it when they add their services.
 */
export const createCatalogRouter = (service: CatalogService, limiter: RequestHandler): Router => {
  const router = Router();
  router.get(
    CATALOG_ROUTES.services,
    limiter,
    validate({ query: catalogQuerySchema }),
    asyncHandler(async (req, res) => {
      const { businessType, gender, page, pageSize } = (
        req.validated as { query: z.infer<typeof catalogQuerySchema> }
      ).query;
      const result = await service.list({
        ...(businessType === undefined ? {} : { businessType }),
        ...(gender === undefined ? {} : { gender }),
        language: req.language,
        params: { page, pageSize },
      });
      sendPaginated(req, res, result.items, { page, pageSize }, result.meta.total);
    }),
  );
  return router;
};
