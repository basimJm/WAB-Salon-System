import { Router, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { AUDIENCES } from '../../../constants/enums';
import { MERCHANT_SALON_ROUTES } from '../../../constants/salon';
import type { SalonAudienceService } from '../../../domain/salons/salonAudience.service';
import { requireOwner } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';

/** The audience the owner widens to (only BOTH passes the rule, §5.19). */
export const audienceWidenSchema = z.object({ audience: z.enum(AUDIENCES) });

/** `PATCH /merchant/v1/salon/audience` (owner): widen a men's/women's salon to BOTH. */
export const createSalonAudienceRouter = (
  service: SalonAudienceService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  router.patch(
    MERCHANT_SALON_ROUTES.audience,
    ...guard,
    requireOwner,
    validate({ body: audienceWidenSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { audience } = (req.validated as { body: z.infer<typeof audienceWidenSchema> }).body;
      sendSuccess(req, res, {
        data: await service.widen({
          salonId: req.member?.salonId ?? '',
          memberId: req.member?.id ?? '',
          audience,
        }),
      });
    }),
  );
  return router;
};
