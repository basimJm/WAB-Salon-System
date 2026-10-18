import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_HOURS_ROUTES } from '../../../constants/hours';
import type { HoursService } from '../../../domain/salons/hoursService';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import { closureParams, closurePatchSchema, closureSchema, weeklySchema } from './hours.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Working hours and closures of the caller's own salon; everything needs `WORKING_HOURS_MANAGE`. */
export const createMerchantHoursRouter = (
  service: HoursService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const routes = MERCHANT_HOURS_ROUTES;
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  router.use(...guard, requirePermission(['WORKING_HOURS_MANAGE']));
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.get(salonOf(req)) });
    }),
  );
  router.put(
    routes.weekly,
    validate({ body: weeklySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { days } = part<typeof weeklySchema>(req, 'body');
      sendSuccess(req, res, { data: await service.setWeekly(salonOf(req), days) });
    }),
  );
  router.post(
    routes.closures,
    validate({ body: closureSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const input = part<typeof closureSchema>(req, 'body');
      sendCreated(req, res, await service.addClosure({ salonId: salonOf(req), ...input }));
    }),
  );
  router.patch(
    routes.closureById,
    validate({ params: closureParams, body: closurePatchSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof closureParams>(req, 'params');
      const patch = part<typeof closurePatchSchema>(req, 'body');
      sendSuccess(req, res, {
        data: await service.updateClosure({ salonId: salonOf(req), id, ...patch }),
      });
    }),
  );
  router.delete(
    routes.closureById,
    validate({ params: closureParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof closureParams>(req, 'params');
      await service.removeClosure({ salonId: salonOf(req), id });
      sendSuccess(req, res);
    }),
  );
  return router;
};
