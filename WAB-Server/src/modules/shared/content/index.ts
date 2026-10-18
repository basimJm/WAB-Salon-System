import type { Router } from 'express';
import { unavailableContentService, type ApiServices } from '../../services';
import { createOtpRouteLimiter } from '../otp';
import { createContentRouter } from './content.routes';

export const createCustomerContentRouter = (services: ApiServices): Router =>
  createContentRouter(
    services.content?.customer ?? unavailableContentService,
    createOtpRouteLimiter(services),
  );
export const createMerchantContentRouter = (services: ApiServices): Router =>
  createContentRouter(
    services.content?.merchant ?? unavailableContentService,
    createOtpRouteLimiter(services),
  );
