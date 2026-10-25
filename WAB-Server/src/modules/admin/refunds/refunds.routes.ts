import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_REFUND_ROUTES } from '../../../constants/refunds';
import type { RefundService } from '../../../domain/refunds/refunds.service';
import type { RefundRaw } from '../../../models/refund.model';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import type { Entity } from '../../../utils/database/plain';
import { formatJod } from '../../../utils/money';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import { manualBody, refundParams, refundsQuery, retryBody } from './refunds.validation';

const present = (r: Entity<RefundRaw>): Record<string, unknown> => ({
  id: r.id,
  bookingId: r.bookingId ?? null,
  transactionId: r.transactionId,
  salonId: r.salonId,
  branchId: r.branchId ?? null,
  customerId: r.customerId,
  amount: formatJod(r.amount),
  source: r.source,
  reason: r.reason ?? null,
  status: r.status,
  attempts: r.attempts,
  lastError: r.lastError ?? null,
  nextAttemptAt: r.nextAttemptAt?.toISOString() ?? null,
  completedAt: r.completedAt?.toISOString() ?? null,
  manual: r.manual === undefined ? null : { by: r.manual.by, reference: r.manual.reference },
  createdAt: r.createdAt.toISOString(),
});

/** Refunds (Admin PRD A17): list, details, retry a failed refund, mark one as refunded manually. */
export const createAdminRefundsRouter = (service: RefundService, guard: RequestHandler): Router => {
  const router = Router();
  const routes = ADMIN_REFUND_ROUTES;
  const idOf = (req: Request): string => (req.validated as { params: { id: string } }).params.id;
  router.use(guard);
  router.get(
    '/',
    validate({ query: refundsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = (
        req.validated as { query: z.infer<typeof refundsQuery> }
      ).query;
      const result = await service.list({ params: { page, pageSize }, ...filter });
      sendPaginated(req, res, result.items.map(present), { page, pageSize }, result.total);
    }),
  );
  router.get(
    routes.byId,
    validate({ params: refundParams }),
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: present(await service.get(idOf(req))) });
    }),
  );
  router.post(
    routes.retry,
    validate({ params: refundParams, body: retryBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { reason } = (req.validated as { body: z.infer<typeof retryBody> }).body;
      sendSuccess(req, res, {
        data: present(await service.retry({ refundId: idOf(req), reason, actor: toActor(req) })),
      });
    }),
  );
  router.post(
    routes.manual,
    validate({ params: refundParams, body: manualBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { reference, reason } = (req.validated as { body: z.infer<typeof manualBody> }).body;
      sendSuccess(req, res, {
        data: present(
          await service.markManual({ refundId: idOf(req), reference, reason, actor: toActor(req) }),
        ),
      });
    }),
  );
  return router;
};
