import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_PAYOUT_DETAILS_ROUTES } from '../../../constants/payoutDetails';
import type { PayoutDetailsService } from '../../../domain/salons/payoutDetails.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { adminPayoutDetailsBody } from '../../merchant/payoutDetails/payoutDetails.validation';
import { salonParams as salonIdParams } from '../salons/salonState.validation';
import { toActor } from '../crud/actor';

/** A salon's bank details for the admin: reveal (audited) and edit with a reason (Admin PRD A18). */
export const createAdminPayoutDetailsRouter = (
  service: PayoutDetailsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const idOf = (req: Request): string => (req.validated as { params: { id: string } }).params.id;
  router.use(guard);
  router.get(
    ADMIN_PAYOUT_DETAILS_ROUTES.byId,
    validate({ params: salonIdParams }),
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, {
        data: await service.revealForAdmin({ salonId: idOf(req), actor: toActor(req) }),
      });
    }),
  );
  router.put(
    ADMIN_PAYOUT_DETAILS_ROUTES.byId,
    validate({ params: salonIdParams, body: adminPayoutDetailsBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = (req.validated as { body: z.infer<typeof adminPayoutDetailsBody> }).body;
      sendSuccess(req, res, {
        data: await service.setByAdmin({ ...body, salonId: idOf(req), actor: toActor(req) }),
      });
    }),
  );
  return router;
};
