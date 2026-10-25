import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type { MerchantReviewsService } from '../../../domain/reviews/merchantReviews.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { merchantReviewsQuery } from './reviews.validation';

/** Published reviews of the caller's salon (M20, `REVIEWS_VIEW`), scoped to the caller's branch. */
export const createMerchantReviewsRouter = (
  service: MerchantReviewsService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  router.get(
    '/',
    ...guard,
    requirePermission(['REVIEWS_VIEW']),
    validate({ query: merchantReviewsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, target, memberId, branchId } = (
        req.validated as { query: z.infer<typeof merchantReviewsQuery> }
      ).query;
      const result = await service.list({
        salonId: req.member?.salonId ?? '',
        member: { id: req.member?.id ?? '', branchId: req.member?.branchId },
        target,
        staffId: memberId,
        branchId,
        params: { page, pageSize },
        language: req.language,
      });
      sendSuccess(req, res, {
        data: { items: result.items, summary: result.summary },
        meta: result.meta,
      });
    }),
  );
  return router;
};
