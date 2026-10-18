import { Router } from 'express';
import { z } from 'zod';
import { GENDERS } from '../../../constants/enums';
import type { BannersService } from '../../../domain/banners';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import type { RequestHandler } from 'express';

export const bannersQuerySchema = z.object({ gender: z.enum(GENDERS) });

/** Public `GET /customer/v1/banners?gender=`: the live banners for that audience. */
export const createCustomerBannersRouter = (
  service: BannersService,
  limiter: RequestHandler,
): Router => {
  const router = Router();
  router.get(
    '/',
    limiter,
    validate({ query: bannersQuerySchema }),
    asyncHandler(async (req, res) => {
      const { gender } = (req.validated as { query: z.infer<typeof bannersQuerySchema> }).query;
      sendSuccess(req, res, { data: await service.live(gender, req.language) });
    }),
  );
  return router;
};
