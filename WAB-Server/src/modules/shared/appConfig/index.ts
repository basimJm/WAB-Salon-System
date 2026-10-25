import type { Router } from 'express';
import type { AppKind } from '../../../constants/enums';
import { unavailableAppConfigService, type ApiServices } from '../../services';
import { createBrowseRouteLimiter } from '../rateLimits';
import { createAppConfigRouter } from './appConfig.routes';

const build = (services: ApiServices, app: AppKind): Router =>
  createAppConfigRouter(
    services.appConfig ?? unavailableAppConfigService,
    app,
    createBrowseRouteLimiter(services, app === 'CUSTOMER' ? 'customer' : 'merchant'),
  );

export const createCustomerAppConfigRouter = (services: ApiServices): Router =>
  build(services, 'CUSTOMER');
export const createMerchantAppConfigRouter = (services: ApiServices): Router =>
  build(services, 'MERCHANT');
