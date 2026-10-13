import { Router } from 'express';
import { CUSTOMER_AUTH_ROUTES } from '../../constants/customerAuth';
import { OTP_ROUTES } from '../../constants/otp';
import { INSTALLATION_ROUTES } from '../../constants/installations';
import { mount } from '../../routes/mount';
import { createCustomerInstallationsRouter } from '../shared/installations';
import { ExternalServiceError } from '../../utils/errors';
import { unavailableCustomerAuth, type ApiServices } from '../services';
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
  return router;
};
