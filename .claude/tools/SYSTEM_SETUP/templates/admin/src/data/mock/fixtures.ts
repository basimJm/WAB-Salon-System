import { appConfigRoutes } from './appConfigRoutes';
import { applicationsRoutes } from './applicationsRoutes';
import { bannersRoutes } from './bannersRoutes';
import { bookingsRoutes } from './bookingsRoutes';
import { catalogRoutes } from './catalogRoutes';
import { customersRoutes } from './customersRoutes';
import { contentRoutes } from './contentRoutes';
import { locationsRoutes } from './locationsRoutes';
import { salonsRoutes } from './salonsRoutes';
import { branchesRoutes } from './branchesRoutes';
import { membersRoutes } from './membersRoutes';
import { createBranchStore } from './branchStore';
import { reviewsRoutes } from './reviewsRoutes';
import { transactionsRoutes } from './transactionsRoutes';
import { refundsRoutes } from './refundsRoutes';
import { payoutsRoutes } from './payoutsRoutes';
import { subscriptionsRoutes } from './subscriptionsRoutes';
import { placementsRoutes } from './placementsRoutes';
import { campaignsRoutes } from './campaignsRoutes';
import { alertsRoutes } from './alertsRoutes';
import { profileRoutes } from './profileRoutes';
import { salonEditRoutes } from './salonEditRoutes';
import { salonInsightsRoutes } from './salonInsightsRoutes';
import { searchRoutes } from './searchRoutes';
import { analyticsRoutes } from './analyticsRoutes';
import { reportsRoutes } from './reportsRoutes';
import { auditRoutes } from './auditRoutes';
import { exportsRoutes } from './exportsRoutes';
import { settingsRoutes } from './settingsRoutes';
import type { MockRoute } from './mockTransport';

/**
 * Everything the mock server serves, typed by the contract. State lives in closures, so every app container
 * (and every test) gets its own copy. Each feature task adds its routes file here.
 */
export function createMockRoutes(): readonly MockRoute[] {
  const branches = createBranchStore();
  return [
    ...settingsRoutes(),
    ...locationsRoutes(),
    ...appConfigRoutes(),
    ...contentRoutes(),
    ...bannersRoutes(),
    ...catalogRoutes(),
    ...salonsRoutes(branches),
    ...branchesRoutes(branches),
    ...membersRoutes(branches),
    ...applicationsRoutes(),
    ...customersRoutes(),
    ...bookingsRoutes(),
    ...reviewsRoutes(),
    ...transactionsRoutes(),
    ...refundsRoutes(),
    ...payoutsRoutes(),
    ...subscriptionsRoutes(),
    ...placementsRoutes(),
    ...alertsRoutes(),
    ...profileRoutes(),
    ...searchRoutes(),
    ...salonEditRoutes(),
    ...salonInsightsRoutes(),
    ...analyticsRoutes(),
    ...reportsRoutes(),
    ...auditRoutes(),
    ...exportsRoutes(),
    ...campaignsRoutes(),
  ];
}
