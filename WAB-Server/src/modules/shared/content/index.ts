import type { Router } from 'express';
import { unavailableContentService, type ApiServices } from '../../services';
import { createBrowseRouteLimiter } from '../rateLimits';
import { createContentRouter } from './content.routes';

export const createCustomerContentRouter = (services: ApiServices): Router =>
  createContentRouter(
    services.content?.customer ?? unavailableContentService,
    createBrowseRouteLimiter(services, 'customer'),
  );
export const createMerchantContentRouter = (services: ApiServices): Router =>
  createContentRouter(
    services.content?.merchant ?? unavailableContentService,
    createBrowseRouteLimiter(services, 'merchant'),
  );
