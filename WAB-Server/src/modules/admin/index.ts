import { Router } from 'express';
import { ADMIN_AUTH_ROUTES } from '../../constants/adminAuth';
import { mount } from '../../routes/mount';
import { unavailableAdminAuth, unavailableAdminLogin, type ApiServices } from '../services';
import { createOtpRouteLimiter } from '../shared/otp';
import { createAdminAuthRouter } from './auth/auth.routes';

/** Router for the /admin/v1 namespace. Feature routers are mounted here as they are built. */
export const createAdminRouter = (services: ApiServices = {}): Router => {
  const router = Router();
  mount(
    router,
    ADMIN_AUTH_ROUTES.base,
    createAdminAuthRouter({
      service: services.adminAuth?.service ?? unavailableAdminAuth,
      login: services.adminAuth?.login ?? unavailableAdminLogin,
      limiter: createOtpRouteLimiter(services),
    }),
  );
  return router;
};
