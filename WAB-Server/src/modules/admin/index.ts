import { Router } from 'express';
import { ADMIN_AUTH_ROUTES } from '../../constants/adminAuth';
import { ADMIN_LOCATION_ROUTES } from '../../constants/adminCrud';
import { ExternalServiceError } from '../../utils/errors';
import { mount } from '../../routes/mount';
import { unavailableAdminAuth, unavailableAdminLogin, type ApiServices } from '../services';
import { createOtpRouteLimiter } from '../shared/otp';
import { createAdminLocationsRouter } from './locations/locations.routes';
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
  if (services.adminGuard !== undefined && services.adminLocations !== undefined) {
    mount(
      router,
      ADMIN_LOCATION_ROUTES.base,
      createAdminLocationsRouter(services.adminLocations, services.adminGuard),
    );
  } else {
    router.use(ADMIN_LOCATION_ROUTES.base, (_req, _res, next) => {
      next(new ExternalServiceError({ unavailable: true }));
    });
  }
  return router;
};
