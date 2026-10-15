import { appConfigRoutes } from './appConfigRoutes';
import { applicationsRoutes } from './applicationsRoutes';
import { bannersRoutes } from './bannersRoutes';
import { catalogRoutes } from './catalogRoutes';
import { customersRoutes } from './customersRoutes';
import { contentRoutes } from './contentRoutes';
import { locationsRoutes } from './locationsRoutes';
import { salonsRoutes } from './salonsRoutes';
import { settingsRoutes } from './settingsRoutes';
import type { MockRoute } from './mockTransport';

/**
 * Everything the mock server serves, typed by the contract. State lives in closures, so every app container
 * (and every test) gets its own copy. Each feature task adds its routes file here.
 */
export function createMockRoutes(): readonly MockRoute[] {
  return [
    ...settingsRoutes(),
    ...locationsRoutes(),
    ...appConfigRoutes(),
    ...contentRoutes(),
    ...bannersRoutes(),
    ...catalogRoutes(),
    ...salonsRoutes(),
    ...applicationsRoutes(),
    ...customersRoutes(),
  ];
}
