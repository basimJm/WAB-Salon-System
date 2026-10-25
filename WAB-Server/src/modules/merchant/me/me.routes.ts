import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_AUTH_ROUTES, MERCHANT_ME_ROUTES } from '../../../constants/merchantAuth';
import type { MemberSelfService } from '../../../domain/team/memberSelf.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { changePhoneSchema, updateMeSchema } from './me.validation';

const bodyOf = <S extends z.ZodType>(req: Request): z.infer<S> =>
  (req.validated as { body: z.infer<S> }).body;

/** "My account" (M25): any signed-in member, for themselves only. */
export const createMerchantMeRouter = (
  service: MemberSelfService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const me = (req: Request): string => req.member?.id ?? '';
  router.get(
    '/',
    ...guard,
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.get(me(req)) });
    }),
  );
  router.patch(
    '/',
    ...guard,
    validate({ body: updateMeSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const patch = bodyOf<typeof updateMeSchema>(req);
      sendSuccess(req, res, { data: await service.update({ memberId: me(req), patch }) });
    }),
  );
  router.post(
    MERCHANT_ME_ROUTES.leave,
    ...guard,
    asyncHandler(async (req: Request, res: Response) => {
      await service.leave({ memberId: me(req), salonId: req.member?.salonId ?? '' });
      sendSuccess(req, res);
    }),
  );
  return router;
};

/** `POST /merchant/v1/auth/change-phone`: mounted under the auth prefix, but needs a session. */
export const createMerchantChangePhoneRouter = (
  service: MemberSelfService,
  guard: readonly RequestHandler[],
  limiter: RequestHandler,
): Router => {
  const router = Router();
  router.post(
    MERCHANT_AUTH_ROUTES.changePhone,
    limiter,
    ...guard,
    validate({ body: changePhoneSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { phone, idToken } = bodyOf<typeof changePhoneSchema>(req);
      const data = await service.changePhone({ memberId: req.member?.id ?? '', phone, idToken });
      sendSuccess(req, res, { data });
    }),
  );
  return router;
};
