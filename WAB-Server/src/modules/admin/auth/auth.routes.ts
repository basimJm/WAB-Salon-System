import { Router, type RequestHandler } from 'express';
import { ADMIN_AUTH_ROUTES } from '../../../constants/adminAuth';
import type { AdminAuthService } from '../../../domain/auth/adminAuth.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { createAdminAuthController } from './auth.controller';
import { refreshSchema } from './auth.validation';

export interface AdminAuthRouterOptions {
  readonly service: AdminAuthService;
  /** Per-IP guard (fails closed). */
  readonly limiter: RequestHandler;
}

/**
 * Session routes of the admin panel. The two-step login (password, then email OTP) is added by
 * SRV-031: a password alone must never open a session.
 */
export const createAdminAuthRouter = ({ service, limiter }: AdminAuthRouterOptions): Router => {
  const router = Router();
  const controller = createAdminAuthController(service);
  const routes = ADMIN_AUTH_ROUTES;
  router.post(
    routes.refresh,
    limiter,
    validate({ body: refreshSchema }),
    asyncHandler(controller.refresh),
  );
  router.post(
    routes.logout,
    limiter,
    validate({ body: refreshSchema }),
    asyncHandler(controller.logout),
  );
  return router;
};
