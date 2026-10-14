import type { Router } from 'express';
import { unavailableLocationsService, type ApiServices } from '../../services';
import { createOtpRouteLimiter } from '../otp';
import { createLocationsRouter } from './locations.routes';

/** Same public lists for the customer and merchant apps (registration forms, filters). */
export const createLocationsRouterFor = (services: ApiServices): Router =>
  createLocationsRouter(
    services.locations ?? unavailableLocationsService,
    createOtpRouteLimiter(services),
  );
