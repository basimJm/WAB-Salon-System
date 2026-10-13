import { Router, type RequestHandler } from 'express';
import type { AppKind } from '../../../constants/enums';
import type { AppConfigService } from '../../../domain/appConfig';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { createAppConfigController } from './appConfig.controller';
import { appConfigQuerySchema } from './appConfig.validation';

export const createAppConfigRouter = (
  service: AppConfigService,
  app: AppKind,
  limiter: RequestHandler,
): Router => {
  const router = Router();
  const controller = createAppConfigController(service, app);
  router.get('/', limiter, validate({ query: appConfigQuerySchema }), asyncHandler(controller.get));
  return router;
};
