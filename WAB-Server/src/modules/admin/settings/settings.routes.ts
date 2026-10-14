import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_AUDIT_LOG_ROUTES, ADMIN_SETTINGS_ROUTES } from '../../../constants/adminSettings';
import type { AdminSettingsService } from '../../../domain/adminSettings/adminSettings.service';
import type { AuditLogRaw } from '../../../models/auditLog.model';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import type { Entity } from '../../../utils/database/plain';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  auditLogParams,
  auditLogsQuery,
  settingParams,
  updateSettingBody,
} from './settings.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

const logData = (l: Entity<AuditLogRaw>): Record<string, unknown> => ({
  ...l,
  createdAt: l.createdAt.toISOString(),
});

/** Platform settings (A28): list with defaults, validated + audited edit. */
export const createAdminSettingsRouter = (
  service: AdminSettingsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.list() });
    }),
  );
  router.put(
    ADMIN_SETTINGS_ROUTES.byKey,
    validate({ params: settingParams, body: updateSettingBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { key } = part<typeof settingParams>(req, 'params');
      const { value, reason } = part<typeof updateSettingBody>(req, 'body');
      sendSuccess(req, res, {
        data: await service.update({ key, value, reason, actor: toActor(req) }),
      });
    }),
  );
  return router;
};

/** Audit log viewer (A29): read-only. */
export const createAdminAuditLogsRouter = (
  service: AdminSettingsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    '/',
    validate({ query: auditLogsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = part<typeof auditLogsQuery>(req, 'query');
      const result = await service.auditLogs({ filter, params: { page, pageSize } });
      sendPaginated(req, res, result.items.map(logData), { page, pageSize }, result.total);
    }),
  );
  router.get(
    ADMIN_AUDIT_LOG_ROUTES.byId,
    validate({ params: auditLogParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof auditLogParams>(req, 'params');
      sendSuccess(req, res, { data: logData(await service.auditLog(id)) });
    }),
  );
  return router;
};
