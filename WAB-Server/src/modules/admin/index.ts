import { Router } from 'express';
import { ADMIN_AUTH_ROUTES } from '../../constants/adminAuth';
import { ADMIN_APP_CONFIG_ROUTES, ADMIN_CONTENT_ROUTES } from '../../constants/adminContent';
import { ADMIN_LOCATION_ROUTES } from '../../constants/adminCrud';
import { mount } from '../../routes/mount';
import {
  unavailableAdminAuth,
  unavailableAdminContent,
  unavailableAdminLocations,
  unavailableGuard,
  unavailableAdminLogin,
  type ApiServices,
} from '../services';
import { createOtpRouteLimiter } from '../shared/otp';
import { createAdminAppConfigRouter, createAdminContentRouter } from './content/content.routes';
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
  mount(
    router,
    ADMIN_LOCATION_ROUTES.base,
    createAdminLocationsRouter(
      services.adminLocations ?? unavailableAdminLocations,
      services.adminGuard ?? unavailableGuard,
    ),
  );
  const content = services.adminContent ?? unavailableAdminContent;
  const guard = services.adminGuard ?? unavailableGuard;
  mount(router, ADMIN_CONTENT_ROUTES.base, createAdminContentRouter(content, guard));
  mount(router, ADMIN_APP_CONFIG_ROUTES.base, createAdminAppConfigRouter(content, guard));
  return router;
};
