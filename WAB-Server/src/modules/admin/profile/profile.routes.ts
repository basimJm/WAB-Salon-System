import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_PROFILE_ROUTES } from '../../../constants/adminProfile';
import type {
  AdminProfile,
  AdminProfileService,
} from '../../../domain/adminProfile/adminProfile.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  changePasswordBody,
  confirmEmailChangeBody,
  requestEmailChangeBody,
  updateProfileBody,
} from './profile.validation';

const bodyOf = <S extends z.ZodType>(req: Request): z.infer<S> =>
  (req.validated as { body: z.infer<S> }).body;

export const profileData = (profile: AdminProfile): Record<string, unknown> => ({
  id: profile.id,
  email: profile.email,
  alertEmails: profile.alertEmails,
  lastLoginAt: profile.lastLoginAt === null ? null : profile.lastLoginAt.toISOString(),
});

/** The signed-in admin's own account (Admin PRD §4); every route works on the token's admin only. */
export const createAdminProfileRouter = (
  service: AdminProfileService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: profileData(await service.get(toActor(req).adminId)) });
    }),
  );
  router.patch(
    '/',
    validate({ body: updateProfileBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { alertEmails } = bodyOf<typeof updateProfileBody>(req);
      const profile = await service.updateAlertEmails({ actor: toActor(req), alertEmails });
      sendSuccess(req, res, { data: profileData(profile) });
    }),
  );
  router.post(
    ADMIN_PROFILE_ROUTES.password,
    validate({ body: changePasswordBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { currentPassword, newPassword } = bodyOf<typeof changePasswordBody>(req);
      await service.changePassword({
        actor: toActor(req),
        currentPassword,
        newPassword,
        language: req.language,
      });
      sendSuccess(req, res, { data: null });
    }),
  );
  router.post(
    ADMIN_PROFILE_ROUTES.emailRequest,
    validate({ body: requestEmailChangeBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { newEmail, password } = bodyOf<typeof requestEmailChangeBody>(req);
      const challenge = await service.requestEmailChange({
        actor: toActor(req),
        newEmail,
        password,
        language: req.language,
      });
      sendSuccess(req, res, {
        data: {
          expiresAt: challenge.expiresAt.toISOString(),
          resendAfterSeconds: challenge.resendAfterSeconds,
        },
      });
    }),
  );
  router.post(
    ADMIN_PROFILE_ROUTES.emailVerify,
    validate({ body: confirmEmailChangeBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { code } = bodyOf<typeof confirmEmailChangeBody>(req);
      const profile = await service.confirmEmailChange({
        actor: toActor(req),
        code,
        language: req.language,
      });
      sendSuccess(req, res, { data: profileData(profile) });
    }),
  );
  return router;
};
