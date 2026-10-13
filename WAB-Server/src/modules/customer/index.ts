import { Router } from 'express';
import { CUSTOMER_AUTH_ROUTES } from '../../constants/customerAuth';
import { OTP_ROUTES } from '../../constants/otp';
import { INSTALLATION_ROUTES } from '../../constants/installations';
import { APP_CONFIG_ROUTES } from '../../constants/appConfig';
import { LOCATION_ROUTES } from '../../constants/locations';
import { CONTENT_ROUTES } from '../../constants/content';
import { BANNER_ROUTES } from '../../constants/banners';
import { mount } from '../../routes/mount';
import { createCustomerAppConfigRouter } from '../shared/appConfig';
import { createCustomerInstallationsRouter } from '../shared/installations';
import { ExternalServiceError } from '../../utils/errors';
import { unavailableBannersService, unavailableCustomerAuth, type ApiServices } from '../services';
import { createCustomerBannersRouter } from './banners/banners.module';
import { createCustomerContentRouter } from '../shared/content';
import { createLocationsRouterFor } from '../shared/locations';
import { createOtpRouteLimiter, createCustomerOtpRouter } from '../shared/otp';
import { createCustomerAuthRouter } from './auth/auth.routes';

/** Router for the /customer/v1 namespace. Feature routers are mounted here as they are built. */
export const createCustomerRouter = (services: ApiServices = {}): Router => {
  const router = Router();
  mount(router, OTP_ROUTES.base, createCustomerOtpRouter(services));
  mount(
    router,
    CUSTOMER_AUTH_ROUTES.base,
    createCustomerAuthRouter({
      service: services.customerAuth?.service ?? unavailableCustomerAuth,
      limiter: createOtpRouteLimiter(services),
      authenticate:
        services.customerAuth?.authenticate ??
        ((_req, _res, next): void => {
          next(new ExternalServiceError({ unavailable: true }));
        }),
    }),
  );
  mount(router, INSTALLATION_ROUTES.base, createCustomerInstallationsRouter(services));
  mount(router, APP_CONFIG_ROUTES.base, createCustomerAppConfigRouter(services));
  mount(router, LOCATION_ROUTES.base, createLocationsRouterFor(services));
  mount(router, CONTENT_ROUTES.base, createCustomerContentRouter(services));
  mount(
    router,
    BANNER_ROUTES.base,
    createCustomerBannersRouter(
      services.banners ?? unavailableBannersService,
      createOtpRouteLimiter(services),
    ),
  );
  return router;
};
