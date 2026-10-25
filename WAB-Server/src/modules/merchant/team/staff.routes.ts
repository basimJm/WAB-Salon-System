import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type { StaffService } from '../../../domain/team/staff.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { staffParams, staffProfileSchema } from './staff.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** `GET|PUT /merchant/v1/team/members/:id/staff`: needs `STAFF_MANAGE` (no access to phone, role or permissions). */
export const createMerchantStaffRouter = (
  service: StaffService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  router.use(...guard, requirePermission(['STAFF_MANAGE']));
  router.get(
    '/:id/staff',
    validate({ params: staffParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof staffParams>(req, 'params');
      sendSuccess(req, res, {
        data: await service.get({
          salonId: salonOf(req),
          memberId: id,
          scope: req.member?.branchId,
        }),
      });
    }),
  );
  router.put(
    '/:id/staff',
    validate({ params: staffParams, body: staffProfileSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof staffParams>(req, 'params');
      const profile = part<typeof staffProfileSchema>(req, 'body');
      sendSuccess(req, res, {
        data: await service.set({
          salonId: salonOf(req),
          memberId: id,
          profile,
          scope: req.member?.branchId,
        }),
      });
    }),
  );
  router.post(
    '/:id/staff/preview',
    validate({ params: staffParams, body: staffProfileSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof staffParams>(req, 'params');
      const profile = part<typeof staffProfileSchema>(req, 'body');
      sendSuccess(req, res, {
        data: await service.preview({
          salonId: salonOf(req),
          memberId: id,
          profile,
          scope: req.member?.branchId,
        }),
      });
    }),
  );
  return router;
};
