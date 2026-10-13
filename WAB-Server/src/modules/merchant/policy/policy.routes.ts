import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type { PolicyService } from '../../../domain/salons/policy.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { policySchema } from './policy.validation';

/** The salon's policy; both routes need `POLICIES_MANAGE` (a manager does not get it by default). */
export const createMerchantPolicyRouter = (
  service: PolicyService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  router.use(...guard, requirePermission(['POLICIES_MANAGE']));
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.get(salonOf(req)) });
    }),
  );
  router.put(
    '/',
    validate({ body: policySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const policy = (req.validated as { body: z.infer<typeof policySchema> }).body;
      sendSuccess(req, res, { data: await service.set(salonOf(req), policy) });
    }),
  );
  return router;
};
