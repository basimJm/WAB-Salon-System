import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_BRANCH_ROUTES } from '../../../constants/branches';
import type { BranchActor, BranchesService } from '../../../domain/branches/branches.service';
import { requireOwner } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import {
  branchParams,
  branchReasonSchema,
  createBranchSchema,
  updateBranchSchema,
} from '../../shared/branches/branch.schemas';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Branches of the caller's salon (§5.16): only the OWNER manages them (`BRANCHES_MANAGE`). */
export const createMerchantBranchesRouter = (
  service: BranchesService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const routes = MERCHANT_BRANCH_ROUTES;
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  const actorOf = (req: Request): BranchActor => ({ type: 'MEMBER', id: req.member?.id ?? '' });
  const idOf = (req: Request): string => part<typeof branchParams>(req, 'params').branchId;
  router.use(...guard, requireOwner);

  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.list(salonOf(req)) });
    }),
  );
  router.post(
    '/',
    validate({ body: createBranchSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = part<typeof createBranchSchema>(req, 'body');
      sendCreated(req, res, await service.create(salonOf(req), body));
    }),
  );
  router.get(
    routes.byId,
    validate({ params: branchParams }),
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.get(salonOf(req), idOf(req)) });
    }),
  );
  router.patch(
    routes.byId,
    validate({ params: branchParams, body: updateBranchSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const patch = part<typeof updateBranchSchema>(req, 'body');
      sendSuccess(req, res, { data: await service.update(salonOf(req), idOf(req), patch) });
    }),
  );
  router.post(
    routes.main,
    validate({ params: branchParams }),
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.setMain(salonOf(req), idOf(req)) });
    }),
  );
  router.post(
    routes.offline,
    validate({ params: branchParams, body: branchReasonSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { reason } = part<typeof branchReasonSchema>(req, 'body');
      const data = await service.setOffline({
        salonId: salonOf(req),
        branchId: idOf(req),
        reason,
        actor: actorOf(req),
      });
      sendSuccess(req, res, { data });
    }),
  );
  router.post(
    routes.online,
    validate({ params: branchParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const data = await service.setOnline({
        salonId: salonOf(req),
        branchId: idOf(req),
        actor: actorOf(req),
      });
      sendSuccess(req, res, { data });
    }),
  );
  router.post(
    routes.close,
    validate({ params: branchParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const data = await service.close({
        salonId: salonOf(req),
        branchId: idOf(req),
        actor: actorOf(req),
      });
      sendSuccess(req, res, { data });
    }),
  );
  return router;
};
