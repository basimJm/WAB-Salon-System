import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_LEAVES_ROUTES } from '../../../constants/leaves';
import type { LeavesService } from '../../../domain/team/leaves.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import {
  leaveParams,
  leavePatchSchema,
  leaveRangeSchema,
  leaveSchema,
  memberLeaveParams,
} from './leaves.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Leaves of a staff member of the caller's salon; needs `STAFF_MANAGE`. */
export const createMerchantLeavesRouter = (
  service: LeavesService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const routes = MERCHANT_LEAVES_ROUTES;
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  router.use(...guard, requirePermission(['STAFF_MANAGE']));
  router.get(
    routes.list,
    validate({ params: memberLeaveParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof memberLeaveParams>(req, 'params');
      sendSuccess(req, res, {
        data: await service.list({
          salonId: salonOf(req),
          memberId: id,
          scope: req.member?.branchId,
        }),
      });
    }),
  );
  router.post(
    routes.preview,
    validate({ params: memberLeaveParams, body: leaveRangeSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof memberLeaveParams>(req, 'params');
      const { from, to } = part<typeof leaveRangeSchema>(req, 'body');
      sendSuccess(req, res, {
        data: await service.preview({
          salonId: salonOf(req),
          memberId: id,
          scope: req.member?.branchId,
          from,
          to,
        }),
      });
    }),
  );
  router.post(
    routes.list,
    validate({ params: memberLeaveParams, body: leaveSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof memberLeaveParams>(req, 'params');
      const input = part<typeof leaveSchema>(req, 'body');
      sendCreated(
        req,
        res,
        await service.add({
          salonId: salonOf(req),
          memberId: id,
          scope: req.member?.branchId,
          ...input,
        }),
      );
    }),
  );
  router.patch(
    routes.byId,
    validate({ params: leaveParams, body: leavePatchSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id, leaveId } = part<typeof leaveParams>(req, 'params');
      const patch = part<typeof leavePatchSchema>(req, 'body');
      sendSuccess(req, res, {
        data: await service.update({
          salonId: salonOf(req),
          memberId: id,
          leaveId,
          scope: req.member?.branchId,
          ...patch,
        }),
      });
    }),
  );
  router.delete(
    routes.byId,
    validate({ params: leaveParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id, leaveId } = part<typeof leaveParams>(req, 'params');
      await service.remove({
        salonId: salonOf(req),
        memberId: id,
        leaveId,
        scope: req.member?.branchId,
      });
      sendSuccess(req, res);
    }),
  );
  return router;
};
