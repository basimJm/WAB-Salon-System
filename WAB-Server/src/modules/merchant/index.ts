import { Router } from 'express';
import { MERCHANT_AUTH_ROUTES } from '../../constants/merchantAuth';
import { OTP_ROUTES } from '../../constants/otp';
import { INSTALLATION_ROUTES } from '../../constants/installations';
import { APP_CONFIG_ROUTES } from '../../constants/appConfig';
import { LOCATION_ROUTES } from '../../constants/locations';
import { CONTENT_ROUTES } from '../../constants/content';
import { CATALOG_ROUTES } from '../../constants/catalog';
import { MERCHANT_SALON_ROUTES } from '../../constants/salon';
import { mount } from '../../routes/mount';
import { createMerchantAppConfigRouter } from '../shared/appConfig';
import { createMerchantInstallationsRouter } from '../shared/installations';
import {
  unavailableCatalogService,
  unavailableGuard,
  unavailableMerchantAuth,
  unavailableSalonApplication,
  unavailableSalonProfile,
  type ApiServices,
} from '../services';
import { createMerchantContentRouter } from '../shared/content';
import { createCatalogRouter } from '../shared/catalog/catalog.module';
import { createLocationsRouterFor } from '../shared/locations';
import { createMerchantOtpRouter, createOtpRouteLimiter } from '../shared/otp';
import { createMerchantProfileRouter } from './salon/profile.routes';
import { createMerchantSalonRouter } from './salon/salon.routes';
import { createMerchantAuthRouter } from './auth/auth.routes';

/** Router for the /merchant/v1 namespace. Feature routers are mounted here as they are built. */
export const createMerchantRouter = (services: ApiServices = {}): Router => {
  const router = Router();
  mount(router, OTP_ROUTES.base, createMerchantOtpRouter(services));
  mount(
    router,
    MERCHANT_AUTH_ROUTES.base,
    createMerchantAuthRouter({
      service: services.merchantAuth ?? unavailableMerchantAuth,
      limiter: createOtpRouteLimiter(services),
    }),
  );
  mount(router, INSTALLATION_ROUTES.base, createMerchantInstallationsRouter(services));
  mount(router, APP_CONFIG_ROUTES.base, createMerchantAppConfigRouter(services));
  mount(router, LOCATION_ROUTES.base, createLocationsRouterFor(services));
  mount(router, CONTENT_ROUTES.base, createMerchantContentRouter(services));
  mount(
    router,
    CATALOG_ROUTES.base,
    createCatalogRouter(
      services.catalog ?? unavailableCatalogService,
      createOtpRouteLimiter(services),
    ),
  );
  mount(
    router,
    MERCHANT_SALON_ROUTES.base,
    createMerchantSalonRouter({
      service: services.salonApplication?.service ?? unavailableSalonApplication,
      limiter: createOtpRouteLimiter(services),
      guard: services.salonApplication?.guard ?? unavailableGuard,
    }),
  );
  mount(
    router,
    MERCHANT_SALON_ROUTES.base,
    createMerchantProfileRouter(
      services.salonProfile?.service ?? unavailableSalonProfile,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  return router;
};
