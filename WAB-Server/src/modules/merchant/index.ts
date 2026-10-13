import { Router } from 'express';
import { MERCHANT_AUTH_ROUTES } from '../../constants/merchantAuth';
import { OTP_ROUTES } from '../../constants/otp';
import { INSTALLATION_ROUTES } from '../../constants/installations';
import { APP_CONFIG_ROUTES } from '../../constants/appConfig';
import { LOCATION_ROUTES } from '../../constants/locations';
import { CONTENT_ROUTES } from '../../constants/content';
import { mount } from '../../routes/mount';
import { createMerchantAppConfigRouter } from '../shared/appConfig';
import { createMerchantInstallationsRouter } from '../shared/installations';
import { unavailableMerchantAuth, type ApiServices } from '../services';
import { createMerchantContentRouter } from '../shared/content';
import { createLocationsRouterFor } from '../shared/locations';
import { createMerchantOtpRouter, createOtpRouteLimiter } from '../shared/otp';
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
  return router;
};
