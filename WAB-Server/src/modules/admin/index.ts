import { Router } from 'express';
import { ADMIN_AUTH_ROUTES } from '../../constants/adminAuth';
import { ADMIN_APP_CONFIG_ROUTES, ADMIN_CONTENT_ROUTES } from '../../constants/adminContent';
import { ADMIN_CATALOG_REQUEST_ROUTES } from '../../constants/salonServices';
import { ADMIN_APPLICATION_ROUTES, ADMIN_SALON_STATE_ROUTES } from '../../constants/salon';
import { ADMIN_CATALOG_ROUTES } from '../../constants/catalog';
import { ADMIN_BANNER_ROUTES } from '../../constants/banners';
import { ADMIN_LOCATION_ROUTES } from '../../constants/adminCrud';
import { UPLOAD_ROUTES } from '../../constants/uploads';
import { mount } from '../../routes/mount';
import { createAdminUploadsRouter } from '../shared/uploads';
import {
  unavailableAdminAuth,
  unavailableAdminBanners,
  unavailableCatalogRequests,
  unavailableSalonReview,
  unavailableSalonState,
  unavailableAdminCatalog,
  unavailableAdminContent,
  unavailableAdminLocations,
  unavailableGuard,
  unavailableAdminLogin,
  type ApiServices,
} from '../services';
import { createOtpRouteLimiter } from '../shared/otp';
import { createAdminAppConfigRouter, createAdminContentRouter } from './content/content.routes';
import { createAdminCatalogRequestsRouter } from './catalogRequests/requests.routes';
import { createAdminSalonStateRouter } from './salons/salonState.routes';
import { createAdminApplicationsRouter } from './applications/applications.routes';
import { createAdminCatalogRouter } from './catalog/catalog.routes';
import { createAdminBannersRouter } from './banners/banners.routes';
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
  mount(
    router,
    ADMIN_BANNER_ROUTES.base,
    createAdminBannersRouter(services.adminBanners ?? unavailableAdminBanners, guard),
  );
  mount(
    router,
    ADMIN_CATALOG_ROUTES.base,
    createAdminCatalogRouter(services.adminCatalog ?? unavailableAdminCatalog, guard),
  );
  mount(
    router,
    ADMIN_APPLICATION_ROUTES.base,
    createAdminApplicationsRouter(services.adminApplications ?? unavailableSalonReview, guard),
  );
  mount(
    router,
    ADMIN_SALON_STATE_ROUTES.base,
    createAdminSalonStateRouter(services.salonState ?? unavailableSalonState, guard),
  );
  mount(router, UPLOAD_ROUTES.base, createAdminUploadsRouter(services));
  mount(
    router,
    ADMIN_CATALOG_REQUEST_ROUTES.base,
    createAdminCatalogRequestsRouter(services.catalogRequests ?? unavailableCatalogRequests, guard),
  );
  return router;
};
