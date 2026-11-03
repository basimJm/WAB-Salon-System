import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type { HomeService } from '../../../domain/home/home.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { homeQuerySchema } from './home.validation';

export interface HomeRouterOptions {
  readonly service: HomeService;
  /** Guests get the same sections; a customer token adds name, bell count and favorites. */
  readonly optionalAuth: RequestHandler;
  readonly limiter: RequestHandler;
}

export const createHomeRouter = ({ service, optionalAuth, limiter }: HomeRouterOptions): Router => {
  const router = Router();
  router.get(
    '/',
    limiter,
    optionalAuth,
    validate({ query: homeQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { gender, lat, lng, businessType } = (
        req.validated as { query: z.infer<typeof homeQuerySchema> }
      ).query;
      sendSuccess(req, res, {
        data: await service.get({
          gender,
          language: req.language,
          customerId: req.auth?.subjectId,
          position: lat === undefined || lng === undefined ? undefined : { lat, lng },
          businessTypes: businessType,
        }),
      });
    }),
  );
  return router;
};
