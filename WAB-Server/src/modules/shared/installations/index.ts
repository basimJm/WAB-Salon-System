import type { RequestHandler, Router } from 'express';
import { ExternalServiceError } from '../../../utils/errors';
import { unavailableInstallationService, type ApiServices } from '../../services';
import { createBrowseRouteLimiter } from '../rateLimits';
import { createInstallationsRouter } from './installations.routes';

const unavailable: RequestHandler = (_req, _res, next) => {
  next(new ExternalServiceError({ unavailable: true }));
};

export const createCustomerInstallationsRouter = (services: ApiServices): Router => {
  const wiring = services.installations;
  return createInstallationsRouter({
    service: wiring?.service ?? unavailableInstallationService,
    app: 'CUSTOMER',
    limiter: createBrowseRouteLimiter(services, 'customer'),
    registerAuth: wiring?.customerOptional ?? unavailable,
    pushAuth: wiring?.customerRequired ?? unavailable,
  });
};

export const createMerchantInstallationsRouter = (services: ApiServices): Router => {
  const wiring = services.installations;
  return createInstallationsRouter({
    service: wiring?.service ?? unavailableInstallationService,
    app: 'MERCHANT',
    limiter: createBrowseRouteLimiter(services, 'merchant'),
    registerAuth: wiring?.merchantRequired ?? unavailable,
    pushAuth: wiring?.merchantRequired ?? unavailable,
  });
};
