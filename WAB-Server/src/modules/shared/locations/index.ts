import type { Router } from 'express';
import { unavailableLocationsService, type ApiServices } from '../../services';
import type { RouteLimitNamespace } from '../../../constants/security';
import { createBrowseRouteLimiter } from '../rateLimits';
import { createLocationsRouter } from './locations.routes';

/** Same public lists for the customer and merchant apps (registration forms, filters). */
export const createLocationsRouterFor = (
  services: ApiServices,
  namespace: RouteLimitNamespace,
): Router =>
  createLocationsRouter(
    services.locations ?? unavailableLocationsService,
    createBrowseRouteLimiter(services, namespace),
  );
