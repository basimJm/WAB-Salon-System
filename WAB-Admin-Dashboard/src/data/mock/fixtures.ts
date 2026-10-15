import { appConfigRoutes } from './appConfigRoutes';
import { applicationsRoutes } from './applicationsRoutes';
import { bannersRoutes } from './bannersRoutes';
import { bookingsRoutes } from './bookingsRoutes';
import { catalogRoutes } from './catalogRoutes';
import { customersRoutes } from './customersRoutes';
import { contentRoutes } from './contentRoutes';
import { locationsRoutes } from './locationsRoutes';
import { salonsRoutes } from './salonsRoutes';
import { reviewsRoutes } from './reviewsRoutes';
import { transactionsRoutes } from './transactionsRoutes';
import { refundsRoutes } from './refundsRoutes';
import { payoutsRoutes } from './payoutsRoutes';
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
    ...bookingsRoutes(),
    ...reviewsRoutes(),
    ...transactionsRoutes(),
    ...refundsRoutes(),
    ...payoutsRoutes(),
  ];
}
