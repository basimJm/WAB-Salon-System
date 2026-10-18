import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { CUSTOMER_PROFILE_ROUTES } from '../../../constants/customerProfile';
import type {
  CustomerProfileService,
  ProfileView,
} from '../../../domain/customers/customerProfile.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { avatarBody, updateProfileBody } from './profile.validation';

export interface CustomerProfileRouterOptions {
  readonly service: CustomerProfileService;
  /** `requireAuth('customer', secret)`. */
  readonly guard: RequestHandler;
  readonly limiter: RequestHandler;
}

const me = (req: Request): string => req.auth?.subjectId ?? '';
const body = <S extends z.ZodType>(req: Request): z.infer<S> =>
  (req.validated as { body: z.infer<S> }).body;
const send = (req: Request, res: Response, profile: ProfileView): void => {
  sendSuccess(req, res, { data: profile });
};

/** The signed-in customer's own profile (S21, S22). */
export const createCustomerProfileRouter = ({
  service,
  guard,
  limiter,
}: CustomerProfileRouterOptions): Router => {
  const router = Router();
  router.use(limiter, guard);
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      send(req, res, await service.get(me(req)));
    }),
  );
  router.patch(
    '/',
    validate({ body: updateProfileBody }),
    asyncHandler(async (req, res) => {
      const patch = body<typeof updateProfileBody>(req);
      send(req, res, await service.update({ customerId: me(req), patch }));
    }),
  );
  router.put(
    CUSTOMER_PROFILE_ROUTES.avatar,
    validate({ body: avatarBody }),
    asyncHandler(async (req, res) => {
      const { key } = body<typeof avatarBody>(req);
      send(req, res, await service.setAvatar({ customerId: me(req), key }));
    }),
  );
  router.delete(
    CUSTOMER_PROFILE_ROUTES.avatar,
    asyncHandler(async (req, res) => {
      send(req, res, await service.removeAvatar(me(req)));
    }),
  );
  router.delete(
    '/',
    asyncHandler(async (req, res) => {
      const { deletionScheduledAt } = await service.deleteAccount(me(req));
      sendSuccess(req, res, { data: { deletionScheduledAt: deletionScheduledAt.toISOString() } });
    }),
  );
  return router;
};
