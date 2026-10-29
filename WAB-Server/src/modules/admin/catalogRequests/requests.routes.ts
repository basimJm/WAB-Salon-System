import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_CATALOG_REQUEST_ROUTES } from '../../../constants/salonServices';
import type {
  CatalogRequestView,
  CatalogRequestsService,
} from '../../../domain/catalog/catalogRequests.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import { approveSchema, rejectSchema, requestParams, requestsQuery } from './requests.validation';

const data = (r: CatalogRequestView): Record<string, unknown> => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
});
const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Admin queue of catalog requests: list, approve (creates the catalog service), reject. */
export const createAdminCatalogRequestsRouter = (
  service: CatalogRequestsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_CATALOG_REQUEST_ROUTES;
  router.use(guard);
  router.get(
    '/',
    validate({ query: requestsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, status, businessType } = part<typeof requestsQuery>(req, 'query');
      const result = await service.listForAdmin({
        status,
        businessType,
        params: { page, pageSize },
      });
      sendPaginated(req, res, result.items.map(data), { page, pageSize }, result.meta.total);
    }),
  );
  router.post(
    routes.approve,
    validate({ params: requestParams, body: approveSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof requestParams>(req, 'params');
      const body = part<typeof approveSchema>(req, 'body');
      sendSuccess(req, res, {
        data: data(await service.approve({ id, ...body, actor: toActor(req) })),
      });
    }),
  );
  router.post(
    routes.reject,
    validate({ params: requestParams, body: rejectSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof requestParams>(req, 'params');
      const { reason } = part<typeof rejectSchema>(req, 'body');
      sendSuccess(req, res, {
        data: data(await service.reject({ id, reason, actor: toActor(req) })),
      });
    }),
  );
  return router;
};
