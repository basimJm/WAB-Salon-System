import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { REVIEW_ROUTES } from '../../../constants/reviews';
import type { ReviewsService } from '../../../domain/reviews/reviews.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import {
  reviewListQuerySchema,
  salonReviewParamsSchema,
  staffReviewParamsSchema,
  submitReviewBodySchema,
} from './reviews.validation';

export interface ReviewsRouterOptions {
  readonly service: ReviewsService;
  /** `requireAuth('customer', secret)`: only a registered customer can write. */
  readonly guard: RequestHandler;
  readonly limiter: RequestHandler;
}

interface Validated {
  params: { salonId: string; memberId?: string };
  query: { page: number; pageSize: number };
  body: z.infer<typeof submitReviewBodySchema>;
}
const validatedOf = (req: Request): Validated => req.validated as unknown as Validated;

/** Salon and staff reviews (S07-S09): public reading, registered customers write. */
export const createReviewsRouter = ({ service, guard, limiter }: ReviewsRouterOptions): Router => {
  const router = Router();
  router.use(limiter);

  const list = (paramsSchema: typeof salonReviewParamsSchema | typeof staffReviewParamsSchema) =>
    [
      validate({ params: paramsSchema, query: reviewListQuerySchema }),
      asyncHandler(async (req: Request, res: Response) => {
        const { params, query } = validatedOf(req);
        const result = await service.list({
          salonId: params.salonId,
          staffId: params.memberId,
          params: query,
          language: req.language,
        });
        sendSuccess(req, res, {
          data: { items: result.items, summary: result.summary },
          meta: result.meta,
        });
      }),
    ] as const;

  const submit = (paramsSchema: typeof salonReviewParamsSchema | typeof staffReviewParamsSchema) =>
    [
      guard,
      validate({ params: paramsSchema, body: submitReviewBodySchema }),
      asyncHandler(async (req: Request, res: Response) => {
        const { params, body } = validatedOf(req);
        const created = await service.submit({
          customerId: req.auth?.subjectId ?? '',
          salonId: params.salonId,
          staffId: params.memberId,
          branchId: body.branchId,
          rating: body.rating,
          comment: body.comment,
        });
        sendCreated(req, res, created);
      }),
    ] as const;

  router.get(REVIEW_ROUTES.salon, ...list(salonReviewParamsSchema));
  router.get(REVIEW_ROUTES.staff, ...list(staffReviewParamsSchema));
  router.post(REVIEW_ROUTES.salon, ...submit(salonReviewParamsSchema));
  router.post(REVIEW_ROUTES.staff, ...submit(staffReviewParamsSchema));
  return router;
};
