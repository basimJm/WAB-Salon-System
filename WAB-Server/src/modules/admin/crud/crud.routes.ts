import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_CRUD_ROUTES } from '../../../constants/adminCrud';
import type { AdminCrudService } from '../../../domain/adminCrud/adminCrud.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from './actor';

export interface AdminCrudRouterOptions<TRaw extends object> {
  readonly service: AdminCrudService<TRaw>;
  /** `requireAuth('admin', secret)`. */
  readonly guard: RequestHandler;
  readonly listQuery: z.ZodType<{ page: number; pageSize: number } & Record<string, unknown>>;
  readonly createBody: z.ZodType<{ reason: string } & Record<string, unknown>>;
  readonly updateBody: z.ZodType<{ reason: string } & Record<string, unknown>>;
}

type Parts = Record<string, Record<string, unknown>>;
const validatedPart = (req: Request, part: 'body' | 'query'): Record<string, unknown> =>
  (req.validated as Parts)[part] ?? {};

/** GET list, GET one, POST create, PATCH update: all behind the admin guard, writes need a reason. */
export const createAdminCrudRouter = <TRaw extends object>({
  service,
  guard,
  listQuery,
  createBody,
  updateBody,
}: AdminCrudRouterOptions<TRaw>): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    ADMIN_CRUD_ROUTES.list,
    validate({ query: listQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = validatedPart(req, 'query') as {
        page: number;
        pageSize: number;
      };
      const result = await service.list(filter, { page, pageSize });
      sendPaginated(req, res, result.items, { page, pageSize }, result.meta.total);
    }),
  );
  router.get(
    ADMIN_CRUD_ROUTES.byId,
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.get(String(req.params['id'])) });
    }),
  );
  router.post(
    ADMIN_CRUD_ROUTES.list,
    validate({ body: createBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { reason, ...data } = validatedPart(req, 'body') as { reason: string };
      const created = await service.create({
        data,
        reason,
        actor: toActor(req),
      });
      sendCreated(req, res, created);
    }),
  );
  router.patch(
    ADMIN_CRUD_ROUTES.byId,
    validate({ body: updateBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { reason, ...patch } = validatedPart(req, 'body') as { reason: string };
      const updated = await service.update({
        id: String(req.params['id']),
        patch,
        reason,
        actor: toActor(req),
      });
      sendSuccess(req, res, { data: updated });
    }),
  );
  return router;
};
