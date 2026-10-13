import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_EXPORT_ROUTES } from '../../../constants/exports';
import type { ExportsService, ExportView } from '../../../domain/exports/exports.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import { createExportBody, exportParams, exportsQuery } from './exports.validation';

export const presentExport = (e: ExportView): Record<string, unknown> => ({
  id: e.id,
  kind: e.kind,
  format: e.format,
  params: e.params,
  status: e.status,
  rowCount: e.rowCount,
  failure: e.failure,
  createdAt: e.createdAt.toISOString(),
  finishedAt: e.finishedAt?.toISOString() ?? null,
  downloadUrl: e.downloadUrl,
});

/** Async exports: request, poll, download (Admin PRD §3 tables, A26 reports). */
export const createAdminExportsRouter = (
  service: ExportsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  router.post(
    '/',
    validate({ body: createExportBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const request = (req.validated as { body: z.infer<typeof createExportBody> }).body;
      sendCreated(req, res, presentExport(await service.request({ request, actor: toActor(req) })));
    }),
  );
  router.get(
    '/',
    validate({ query: exportsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize } = (req.validated as { query: z.infer<typeof exportsQuery> }).query;
      const result = await service.list({ params: { page, pageSize } });
      sendPaginated(req, res, result.items.map(presentExport), { page, pageSize }, result.total);
    }),
  );
  router.get(
    ADMIN_EXPORT_ROUTES.byId,
    validate({ params: exportParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: { id: string } }).params;
      sendSuccess(req, res, { data: presentExport(await service.get(id)) });
    }),
  );
  return router;
};
