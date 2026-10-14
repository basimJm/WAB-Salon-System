import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_PLACEMENT_ROUTES } from '../../../constants/placements';
import type {
  PlacementRow,
  PlacementsService,
} from '../../../domain/placements/placements.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  createPlacementBody,
  endPlacementBody,
  placementParams,
  placementsQuery,
  reorderBody,
  updatePlacementBody,
} from './placements.validation';

const present = (p: PlacementRow): Record<string, unknown> => ({
  ...p,
  startAt: p.startAt.toISOString(),
  endAt: p.endAt.toISOString(),
});

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'query' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Recommended placements (A20): list, add, edit, end now, reorder. */
export const createAdminPlacementsRouter = (
  service: PlacementsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_PLACEMENT_ROUTES;
  router.use(guard);
  router.get(
    '/',
    validate({ query: placementsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = part<typeof placementsQuery>(req, 'query');
      const result = await service.list({ ...filter, params: { page, pageSize } });
      sendPaginated(req, res, result.items.map(present), { page, pageSize }, result.total);
    }),
  );
  router.post(
    '/',
    validate({ body: createPlacementBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { reason, ...data } = part<typeof createPlacementBody>(req, 'body');
      sendCreated(req, res, present(await service.create({ data, reason, actor: toActor(req) })));
    }),
  );
  router.put(
    routes.reorder,
    validate({ body: reorderBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = part<typeof reorderBody>(req, 'body');
      const result = await service.reorder({ ...body, actor: toActor(req) });
      sendSuccess(req, res, { data: result.map(present) });
    }),
  );
  router.patch(
    routes.byId,
    validate({ params: placementParams, body: updatePlacementBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof placementParams>(req, 'params');
      const { reason, ...patch } = part<typeof updatePlacementBody>(req, 'body');
      const result = await service.update({ id, patch, reason, actor: toActor(req) });
      sendSuccess(req, res, { data: present(result) });
    }),
  );
  router.post(
    routes.end,
    validate({ params: placementParams, body: endPlacementBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof placementParams>(req, 'params');
      const { reason } = part<typeof endPlacementBody>(req, 'body');
      sendSuccess(req, res, {
        data: present(await service.end({ id, reason, actor: toActor(req) })),
      });
    }),
  );
  return router;
};
