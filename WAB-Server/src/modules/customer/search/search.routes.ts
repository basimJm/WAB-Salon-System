import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { SEARCH_ROUTES } from '../../../constants/search';
import type { SalonCard, SearchService } from '../../../domain/search/search.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { formatJod } from '../../../utils/money';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { filtersQuerySchema, searchQuerySchema } from './search.validation';

const query = <S extends z.ZodType>(req: Request): z.infer<S> =>
  (req.validated as { query: z.infer<S> }).query;

export const cardData = (c: SalonCard): SalonCard => c;

export interface SearchRouterOptions {
  readonly service: SearchService;
  /** Guests may search; a valid customer token only adds `isFavorite`. */
  readonly optionalAuth: RequestHandler;
  readonly limiter: RequestHandler;
}

/** Public salon search for the selected gender (S04) and the filter sheet bounds (S05). */
export const createSearchRouter = ({
  service,
  optionalAuth,
  limiter,
}: SearchRouterOptions): Router => {
  const router = Router();
  router.get(
    '/',
    limiter,
    optionalAuth,
    validate({ query: searchQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...rest } = query<typeof searchQuerySchema>(req);
      const result = await service.search({
        query: rest,
        params: { page, pageSize },
        customerId: req.auth?.subjectId,
        language: req.language,
      });
      sendPaginated(req, res, result.items.map(cardData), { page, pageSize }, result.meta.total);
    }),
  );
  router.get(
    SEARCH_ROUTES.filters,
    limiter,
    validate({ query: filtersQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { gender, businessType, serviceIds } = query<typeof filtersQuerySchema>(req);
      const bounds = await service.priceBounds({
        gender,
        serviceIds,
        ...(businessType === undefined ? {} : { businessType }),
      });
      sendSuccess(req, res, {
        data: {
          priceRange:
            bounds === null ? null : { min: formatJod(bounds.min), max: formatJod(bounds.max) },
        },
      });
    }),
  );
  return router;
};
