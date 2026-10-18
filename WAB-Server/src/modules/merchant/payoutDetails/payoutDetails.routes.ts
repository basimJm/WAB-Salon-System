import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type { PayoutDetailsService } from '../../../domain/salons/payoutDetails.service';
import { requireOwner } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { ownerPayoutDetailsBody } from './payoutDetails.validation';

/** The salon's bank details: OWNER only (Merchant PRD M22); changing them needs an OTP. */
export const createMerchantPayoutDetailsRouter = (
  service: PayoutDetailsService,
  guard: readonly RequestHandler[],
  limiter: RequestHandler,
): Router => {
  const router = Router();
  router.use(limiter, ...guard, requireOwner);
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.getForOwner(req.member?.salonId ?? '') });
    }),
  );
  router.put(
    '/',
    validate({ body: ownerPayoutDetailsBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = (req.validated as { body: z.infer<typeof ownerPayoutDetailsBody> }).body;
      sendSuccess(req, res, {
        data: await service.setByOwner({
          ...body,
          salonId: req.member?.salonId ?? '',
          memberId: req.member?.id ?? '',
        }),
      });
    }),
  );
  return router;
};
