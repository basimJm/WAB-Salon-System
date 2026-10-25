import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_ALERT_ROUTES } from '../../../constants/alerts';
import type { Language } from '../../../constants/i18n';
import type { AlertInbox } from '../../../domain/alerts/alertInbox.service';
import { alertTitles, normalizeAlertEntityType } from '../../../domain/alerts/alertText';
import { validate } from '../../../middlewares/validate';
import type { AlertRaw } from '../../../models/alert.model';
import { asyncHandler } from '../../../utils/async';
import type { Entity } from '../../../utils/database/plain';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { alertParams, alertsQuery } from './alerts.validation';

/** `title` in the request language, `titles` in both (admin answers carry AR and EN, SRV-150). */
export const presentAlert = (a: Entity<AlertRaw>, language: Language): Record<string, unknown> => {
  const titles = alertTitles(a);
  return {
    id: a.id,
    kind: a.kind,
    severity: a.severity,
    title: titles[language],
    titles,
    entityType: normalizeAlertEntityType(a.entityType),
    entityId: a.entityId ?? null,
    data: a.data,
    status: a.status,
    emailedAt: a.emailedAt?.toISOString() ?? null,
    acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
};

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
      sendPaginated(
        req,
        res,
        result.items.map((a) => presentAlert(a, req.language)),
        { page, pageSize },
        result.total,
      );
    }),
  );
  router.post(
    ADMIN_ALERT_ROUTES.acknowledge,
    validate({ params: alertParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: { id: string } }).params;
      sendSuccess(req, res, {
        data: presentAlert(await service.acknowledge(id, now()), req.language),
      });
    }),
  );
  return router;
};
