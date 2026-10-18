import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_REVIEW_ROUTES } from '../../../constants/reviews';
import type {
  AdminReviewRow,
  AdminReviewsService,
} from '../../../domain/reviews/adminReviews.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  adminReviewsQuery,
  bulkBody,
  optionalReasonBody,
  removeBody,
  reviewIdParams,
} from './reviews.validation';

const rowData = (r: AdminReviewRow): Record<string, unknown> => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  moderation: r.moderation === null ? null : { ...r.moderation, at: r.moderation.at.toISOString() },
});

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'query' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Reviews moderation (A22): queue, approve, reject, bulk, take down. */
export const createAdminReviewsRouter = (
  service: AdminReviewsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_REVIEW_ROUTES;
  router.use(guard);
  router.get(
    '/',
    validate({ query: adminReviewsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = part<typeof adminReviewsQuery>(req, 'query');
      const result = await service.list({ ...filter, params: { page, pageSize } });
      sendPaginated(req, res, result.items.map(rowData), { page, pageSize }, result.total);
    }),
  );
  router.post(
    routes.bulk,
    validate({ body: bulkBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = part<typeof bulkBody>(req, 'body');
      sendSuccess(req, res, { data: await service.bulk({ ...body, actor: toActor(req) }) });
    }),
  );
  for (const decision of ['approve', 'reject'] as const) {
    router.post(
      routes[decision],
      validate({ params: reviewIdParams, body: optionalReasonBody }),
      asyncHandler(async (req: Request, res: Response) => {
        const { id } = part<typeof reviewIdParams>(req, 'params');
        const { reason } = part<typeof optionalReasonBody>(req, 'body');
        const result = await service.decide({ id, decision, reason, actor: toActor(req) });
        sendSuccess(req, res, { data: rowData(result) });
      }),
    );
  }
  router.post(
    routes.remove,
    validate({ params: reviewIdParams, body: removeBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof reviewIdParams>(req, 'params');
      const { reason } = part<typeof removeBody>(req, 'body');
      sendSuccess(req, res, {
        data: rowData(await service.remove({ id, reason, actor: toActor(req) })),
      });
    }),
  );
  return router;
};
