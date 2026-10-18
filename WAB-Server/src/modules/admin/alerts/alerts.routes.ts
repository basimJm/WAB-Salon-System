import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_ALERT_ROUTES } from '../../../constants/alerts';
import type { AlertInbox } from '../../../domain/alerts/alertInbox.service';
import { validate } from '../../../middlewares/validate';
import type { AlertRaw } from '../../../models/alert.model';
import { asyncHandler } from '../../../utils/async';
import type { Entity } from '../../../utils/database/plain';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { alertParams, alertsQuery } from './alerts.validation';

export const presentAlert = (a: Entity<AlertRaw>): Record<string, unknown> => ({
  id: a.id,
  kind: a.kind,
  severity: a.severity,
  title: a.title,
  entityType: a.entityType ?? null,
  entityId: a.entityId ?? null,
  data: a.data,
  status: a.status,
  emailedAt: a.emailedAt?.toISOString() ?? null,
  acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
  createdAt: a.createdAt.toISOString(),
});

/** The alerts page and the bell (Admin PRD A27). */
export const createAdminAlertsRouter = (
  service: AlertInbox,
  guard: RequestHandler,
  now: () => Date = () => new Date(),
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    ADMIN_ALERT_ROUTES.count,
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: { new: await service.newCount() } });
    }),
  );
  router.get(
    '/',
    validate({ query: alertsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = (
        req.validated as { query: z.infer<typeof alertsQuery> }
      ).query;
      const result = await service.list({ params: { page, pageSize }, ...filter });
      sendPaginated(req, res, result.items.map(presentAlert), { page, pageSize }, result.total);
    }),
  );
  router.post(
    ADMIN_ALERT_ROUTES.acknowledge,
    validate({ params: alertParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: { id: string } }).params;
      sendSuccess(req, res, { data: presentAlert(await service.acknowledge(id, now())) });
    }),
  );
  return router;
};
