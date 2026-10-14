import { Router, type Request, type RequestHandler, type Response } from 'express';
import { FAVORITE_ROUTES } from '../../../constants/favorites';
import type { FavoritesService } from '../../../domain/favorites/favorites.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { favoriteParamsSchema, favoritesQuerySchema } from './favorites.validation';

export interface FavoritesRouterOptions {
  readonly service: FavoritesService;
  /** `requireAuth('customer', secret)`: favorites need a registered customer. */
  readonly guard: RequestHandler;
  readonly limiter: RequestHandler;
}

const customerOf = (req: Request): string => req.auth?.subjectId ?? '';
const salonOf = (req: Request): string =>
  (req.validated as { params: { salonId: string } }).params.salonId;

export const createFavoritesRouter = ({
  service,
  guard,
  limiter,
}: FavoritesRouterOptions): Router => {
  const router = Router();
  router.use(limiter, guard);
  router.get(
    '/',
    validate({ query: favoritesQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize } = (req.validated as { query: { page: number; pageSize: number } })
        .query;
      const result = await service.list({
        customerId: customerOf(req),
        params: { page, pageSize },
      });
      sendPaginated(req, res, result.items, { page, pageSize }, result.meta.total);
    }),
  );
  router.put(
    FAVORITE_ROUTES.bySalon,
    validate({ params: favoriteParamsSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await service.add({ customerId: customerOf(req), salonId: salonOf(req) });
      sendSuccess(req, res, { data: { isFavorite: true } });
    }),
  );
  router.delete(
    FAVORITE_ROUTES.bySalon,
    validate({ params: favoriteParamsSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await service.remove({ customerId: customerOf(req), salonId: salonOf(req) });
      sendSuccess(req, res, { data: { isFavorite: false } });
    }),
  );
  return router;
};
