import { Router, type RequestHandler } from 'express';
import type { AppKind } from '../../../constants/enums';
import { INSTALLATION_ROUTES } from '../../../constants/installations';
import type { InstallationService } from '../../../domain/installations/installations.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { createInstallationsController } from './installations.controller';
import { pushEnabledSchema, registerInstallationSchema } from './installations.validation';

export interface InstallationsRouterOptions {
  readonly service: InstallationService;
  readonly app: AppKind;
  readonly limiter: RequestHandler;
  /** Customer app: optional (guests register too). Merchant app: required. */
  readonly registerAuth: RequestHandler;
  /** Customer app only: the account-wide push switch. */
  readonly pushAuth?: RequestHandler;
}

export const createInstallationsRouter = ({
  service,
  app,
  limiter,
  registerAuth,
  pushAuth,
}: InstallationsRouterOptions): Router => {
  const router = Router();
  const controller = createInstallationsController(service, app);
  router.put(
    INSTALLATION_ROUTES.register,
    limiter,
    registerAuth,
    validate({ body: registerInstallationSchema }),
    asyncHandler(controller.register),
  );
  if (pushAuth !== undefined) {
    router.patch(
      INSTALLATION_ROUTES.pushEnabled,
      limiter,
      pushAuth,
      validate({ body: pushEnabledSchema }),
      asyncHandler(controller.setPushEnabled),
    );
  }
  return router;
};
