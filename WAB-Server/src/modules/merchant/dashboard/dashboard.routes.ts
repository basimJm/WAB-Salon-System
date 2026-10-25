import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { MerchantDashboardService } from '../../../domain/dashboard/merchantDashboard.service';
import { requirePermission } from '../../../middlewares/permission';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';

/** Home screen aggregate (M07, `DASHBOARD_VIEW`); sections follow the member's other permissions. */
export const createMerchantDashboardRouter = (
  service: MerchantDashboardService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  router.get(
    '/',
    ...guard,
    requirePermission(['DASHBOARD_VIEW']),
    asyncHandler(async (req: Request, res: Response) => {
      const data = await service.get({
        salonId: req.member?.salonId ?? '',
        member: {
          id: req.member?.id ?? '',
          permissions: req.member?.permissions ?? [],
          branchId: req.member?.branchId,
        },
        language: req.language,
      });
      sendSuccess(req, res, { data });
    }),
  );
  return router;
};
