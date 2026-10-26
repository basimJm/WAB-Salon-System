import { Router, type Request, type RequestHandler, type Response } from 'express';
import { SALON_DETAILS_ROUTES } from '../../../constants/salonDetails';
import type { SalonDetailsService } from '../../../domain/salonDetails/salonDetails.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { salonParamsSchema, salonQuerySchema, staffParamsSchema } from './salonDetails.validation';

export interface SalonDetailsRouterOptions {
  readonly service: SalonDetailsService;
  /** Guests may look; a valid customer token only adds `isFavorite`. */
  readonly optionalAuth: RequestHandler;
  readonly limiter: RequestHandler;
}

const params = (req: Request): Record<string, string> =>
  (req.validated as { params: Record<string, string> }).params;

/** Salon details (S07) and the staff sheet, public for LIVE salons. */
export const createSalonDetailsRouter = ({
  service,
  optionalAuth,
  limiter,
}: SalonDetailsRouterOptions): Router => {
  const router = Router();
  router.get(
    SALON_DETAILS_ROUTES.byId,
    limiter,
    optionalAuth,
    validate({ params: salonParamsSchema, query: salonQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { query } = req.validated as { query: { branchId?: string } };
      sendSuccess(req, res, {
        data: await service.get({
          salonId: params(req)['salonId'] ?? '',
          language: req.language,
          customerId: req.auth?.subjectId,
          branchId: query.branchId,
        }),
      });
    }),
  );
  router.get(
    SALON_DETAILS_ROUTES.staff,
    limiter,
    validate({ params: staffParamsSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { salonId = '', memberId = '' } = params(req);
      sendSuccess(req, res, {
        data: await service.staff({ salonId, memberId, language: req.language }),
      });
    }),
  );
  return router;
};
