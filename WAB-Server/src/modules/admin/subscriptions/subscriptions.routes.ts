import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_SUBSCRIPTION_ROUTES } from '../../../constants/subscriptions';
import type {
  PaymentRow,
  SubscriptionsService,
  SubscriptionView,
} from '../../../domain/subscriptions/subscriptions.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { formatJod } from '../../../utils/money';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import { recordPaymentBody, salonParams, subscriptionsQuery } from './subscriptions.validation';

const presentPayment = (p: PaymentRow): Record<string, unknown> => ({
  amount: formatJod(p.amount),
  paidAt: p.paidAt.toISOString(),
  periodFrom: p.periodFrom.toISOString(),
  periodTo: p.periodTo.toISOString(),
  method: p.method,
  reference: p.reference,
  note: p.note ?? null,
  recordedBy: p.recordedBy,
});
const present = (s: SubscriptionView): Record<string, unknown> => ({
  salonId: s.salonId,
  salonName: s.salonName,
  status: s.status,
  trialEndsAt: s.trialEndsAt.toISOString(),
  currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
  endsAt: s.endsAt.toISOString(),
  daysRemaining: s.daysRemaining,
  lastPayment: s.lastPayment === null ? null : presentPayment(s.lastPayment),
  payments: s.payments.map(presentPayment),
});

/** Subscriptions (Admin PRD A19): list, details, record a payment made outside the app. */
export const createAdminSubscriptionsRouter = (
  service: SubscriptionsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_SUBSCRIPTION_ROUTES;
  const salonOf = (req: Request): string =>
    (req.validated as { params: { salonId: string } }).params.salonId;
  router.use(guard);
  router.get(
    '/',
    validate({ query: subscriptionsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = (
        req.validated as { query: z.infer<typeof subscriptionsQuery> }
      ).query;
      const result = await service.list({ params: { page, pageSize }, ...filter });
      sendPaginated(req, res, result.items.map(present), { page, pageSize }, result.total);
    }),
  );
  router.get(
    routes.bySalon,
    validate({ params: salonParams }),
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: present(await service.get(salonOf(req))) });
    }),
  );
  router.post(
    routes.payments,
    validate({ params: salonParams, body: recordPaymentBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = (req.validated as { body: z.infer<typeof recordPaymentBody> }).body;
      sendCreated(
        req,
        res,
        present(
          await service.recordPayment({ salonId: salonOf(req), ...body, actor: toActor(req) }),
        ),
      );
    }),
  );
  return router;
};
