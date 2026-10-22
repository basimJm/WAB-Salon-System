import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_CUSTOMER_ROUTES } from '../../../constants/adminCustomers';
import type { AdminCustomerExtrasService } from '../../../domain/customers/adminCustomerExtras.service';
import type { AdminReviewRow } from '../../../domain/reviews/adminReviews.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  customerParams,
  editCustomerBody,
  pageQuery,
  pushBody,
  reasonBody,
} from './customerExtras.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

const reviewData = (r: AdminReviewRow): Record<string, unknown> => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  moderation: r.moderation === null ? null : { ...r.moderation, at: r.moderation.at.toISOString() },
});

/** Customer extras (A12): edit, written reviews, notifications received, push to one, force delete. */
export const createAdminCustomerExtrasRouter = (
  service: AdminCustomerExtrasService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_CUSTOMER_ROUTES;
  router.use(guard);
  router.patch(
    routes.byId,
    validate({ params: customerParams, body: editCustomerBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof customerParams>(req, 'params');
      const { reason, ...patch } = part<typeof editCustomerBody>(req, 'body');
      sendSuccess(req, res, {
        data: await service.update({ customerId: id, patch, reason, actor: toActor(req) }),
      });
    }),
  );
  router.get(
    routes.reviews,
    validate({ params: customerParams, query: pageQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof customerParams>(req, 'params');
      const { page, pageSize } = part<typeof pageQuery>(req, 'query');
      const result = await service.reviews({ customerId: id, params: { page, pageSize } });
      sendPaginated(req, res, result.items.map(reviewData), { page, pageSize }, result.total);
    }),
  );
  router.get(
    routes.notifications,
    validate({ params: customerParams, query: pageQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof customerParams>(req, 'params');
      const { page, pageSize } = part<typeof pageQuery>(req, 'query');
      const result = await service.notifications({ customerId: id, params: { page, pageSize } });
      sendPaginated(
        req,
        res,
        result.items.map((n) => ({
          ...n,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
        { page, pageSize },
        result.total,
      );
    }),
  );
  router.post(
    routes.push,
    validate({ params: customerParams, body: pushBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof customerParams>(req, 'params');
      const { reason, ...message } = part<typeof pushBody>(req, 'body');
      const campaign = await service.push({
        customerId: id,
        ...message,
        reason,
        actor: toActor(req),
      });
      sendCreated(req, res, {
        campaignId: campaign.id,
        status: campaign.status,
        scheduledAt: campaign.scheduledAt.toISOString(),
      });
    }),
  );
  router.post(
    routes.forceDelete,
    validate({ params: customerParams, body: reasonBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof customerParams>(req, 'params');
      const { reason } = part<typeof reasonBody>(req, 'body');
      await service.forceDelete({ customerId: id, reason, actor: toActor(req) });
      sendSuccess(req, res, { data: null });
    }),
  );
  return router;
};
