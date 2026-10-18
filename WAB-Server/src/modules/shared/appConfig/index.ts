import type { Router } from 'express';
import type { AppKind } from '../../../constants/enums';
import { unavailableAppConfigService, type ApiServices } from '../../services';
import { createOtpRouteLimiter } from '../otp';
import { createAppConfigRouter } from './appConfig.routes';

const build = (services: ApiServices, app: AppKind): Router =>
  createAppConfigRouter(
    services.appConfig ?? unavailableAppConfigService,
    app,
    createOtpRouteLimiter(services),
  );

export const createCustomerAppConfigRouter = (services: ApiServices): Router =>
  build(services, 'CUSTOMER');
export const createMerchantAppConfigRouter = (services: ApiServices): Router =>
  build(services, 'MERCHANT');
