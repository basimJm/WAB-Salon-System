import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_BRANCH_ROUTES } from '../../../constants/branches';
import type { AdminBranchesService } from '../../../domain/branches/adminBranches.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  adminBranchOfflineBody,
  adminBranchReasonBody,
  adminCreateBranchBody,
  adminUpdateBranchBody,
  salonBranchParams,
  salonBranchesParams,
  salonBranchesQuery,
} from './branches.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Branches of any salon (§5.16, Admin PRD A13): full CRUD with reason + audit + owner notice. */
export const createAdminBranchesRouter = (
  service: AdminBranchesService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_BRANCH_ROUTES;
  router.use(guard);
  const target = (req: Request): { salonId: string; branchId: string } => {
    const { id, branchId } = part<typeof salonBranchParams>(req, 'params');
    return { salonId: id, branchId };
  };
  const reasonOf = (req: Request): string => part<typeof adminBranchReasonBody>(req, 'body').reason;

  router.get(
    routes.list,
    validate({ params: salonBranchesParams, query: salonBranchesQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonBranchesParams>(req, 'params');
      const params = part<typeof salonBranchesQuery>(req, 'query');
      const { items, total } = await service.list(id, params);
      sendPaginated(req, res, items, params, total);
    }),
  );
  router.post(
    routes.list,
    validate({ params: salonBranchesParams, body: adminCreateBranchBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonBranchesParams>(req, 'params');
      const { reason, ...branch } = part<typeof adminCreateBranchBody>(req, 'body');
      sendCreated(
        req,
        res,
        await service.create({ salonId: id, reason, actor: toActor(req), branch }),
      );
    }),
  );
  router.get(
    routes.byId,
    validate({ params: salonBranchParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { salonId, branchId } = target(req);
      sendSuccess(req, res, { data: await service.get(salonId, branchId) });
    }),
  );
  router.patch(
    routes.byId,
    validate({ params: salonBranchParams, body: adminUpdateBranchBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { reason, ...patch } = part<typeof adminUpdateBranchBody>(req, 'body');
      const data = await service.update({ ...target(req), reason, actor: toActor(req), patch });
      sendSuccess(req, res, { data });
    }),
  );
  const action = (
    path: string,
    body: typeof adminBranchReasonBody | typeof adminBranchOfflineBody,
    run: (input: Parameters<AdminBranchesService['setMain']>[0]) => Promise<unknown>,
  ): void => {
    router.post(
      path,
      validate({ params: salonBranchParams, body }),
      asyncHandler(async (req: Request, res: Response) => {
        const data = await run({ ...target(req), reason: reasonOf(req), actor: toActor(req) });
        sendSuccess(req, res, { data });
      }),
    );
  };
  action(routes.main, adminBranchReasonBody, (input) => service.setMain(input));
  action(routes.offline, adminBranchOfflineBody, (input) => service.setOffline(input));
  action(routes.online, adminBranchReasonBody, (input) => service.setOnline(input));
  action(routes.close, adminBranchReasonBody, (input) => service.close(input));
  return router;
};
