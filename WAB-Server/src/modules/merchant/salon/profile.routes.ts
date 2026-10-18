import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type { SalonProfileService } from '../../../domain/salons/salonProfile.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { MERCHANT_PROFILE_ROUTES } from '../../../constants/salon';
import { profilePatchSchema } from './profile.validation';

/** `GET /merchant/v1/salon` for any member; `PATCH .../profile` needs `SALON_PROFILE_MANAGE`. */
export const createMerchantProfileRouter = (
  service: SalonProfileService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  router.get(
    MERCHANT_PROFILE_ROUTES.root,
    ...guard,
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.get(salonOf(req)) });
    }),
  );
  router.patch(
    MERCHANT_PROFILE_ROUTES.profile,
    ...guard,
    requirePermission(['SALON_PROFILE_MANAGE']),
    validate({ body: profilePatchSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const patch = (req.validated as { body: z.infer<typeof profilePatchSchema> }).body;
      sendSuccess(req, res, { data: await service.update(salonOf(req), patch) });
    }),
  );
  return router;
};
