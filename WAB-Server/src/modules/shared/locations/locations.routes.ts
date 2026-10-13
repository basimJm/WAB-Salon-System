import { Router, type RequestHandler } from 'express';
import { LOCATION_ROUTES } from '../../../constants/locations';
import type { LocationsService } from '../../../domain/locations';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { createLocationsController } from './locations.controller';
import { areasQuerySchema, citiesQuerySchema } from './locations.validation';

export const createLocationsRouter = (
  service: LocationsService,
  limiter: RequestHandler,
): Router => {
  const router = Router();
  const controller = createLocationsController(service);
  router.get(LOCATION_ROUTES.countries, limiter, asyncHandler(controller.countries));
  router.get(
    LOCATION_ROUTES.cities,
    limiter,
    validate({ query: citiesQuerySchema }),
    asyncHandler(controller.cities),
  );
  router.get(
    LOCATION_ROUTES.areas,
    limiter,
    validate({ query: areasQuerySchema }),
    asyncHandler(controller.areas),
  );
  return router;
};
