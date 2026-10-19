import { Router } from 'express';
import { ADMIN_AUTH_ROUTES } from '../../constants/adminAuth';
import { ADMIN_APP_CONFIG_ROUTES, ADMIN_CONTENT_ROUTES } from '../../constants/adminContent';
import { ADMIN_CATALOG_REQUEST_ROUTES } from '../../constants/salonServices';
import { ADMIN_APPLICATION_ROUTES, ADMIN_SALON_STATE_ROUTES } from '../../constants/salon';
import { ADMIN_CATALOG_ROUTES } from '../../constants/catalog';
import { ADMIN_BANNER_ROUTES } from '../../constants/banners';
import { ADMIN_LOCATION_ROUTES } from '../../constants/adminCrud';
import { UPLOAD_ROUTES } from '../../constants/uploads';
import { mount } from '../../routes/mount';
import { createAdminUploadsRouter } from '../shared/uploads';
import {
  unavailableAdminAuth,
  unavailableAdminBanners,
  unavailableAdminSalons,
  unavailableCatalogRequests,
  unavailableAdminPlacements,
  unavailableCampaigns,
  unavailableAdminSettings,
  unavailableAdminProfile,
  unavailableAdminSearch,
  unavailableAdminSalonEdit,
  unavailableAdminSalonInsights,
  unavailableAdminCustomerExtras,
  unavailableAdminCustomers,
  unavailableAdminReviews,
  unavailableSalonReview,
  unavailableSalonState,
  unavailableAdminCatalog,
  unavailableAdminContent,
  unavailableAdminLocations,
  unavailableGuard,
  unavailableAdminLogin,
  type ApiServices,
  unavailableAdminPayouts,
  unavailableAdminTransactions,
  unavailableAdminAnalytics,
  unavailableAdminAlerts,
  unavailableAdminReports,
  unavailableAdminExports,
  unavailablePayoutDetails,
  unavailableAdminSubscriptions,
  unavailableAdminRefunds,
  unavailableBookingQueries,
} from '../services';
import { createOtpRouteLimiter } from '../shared/otp';
import { createAdminAppConfigRouter, createAdminContentRouter } from './content/content.routes';
import { createAdminCatalogRequestsRouter } from './catalogRequests/requests.routes';
import { createAdminSalonsRouter } from './salons/adminSalons.routes';
import { createAdminSalonStateRouter } from './salons/salonState.routes';
import { createAdminCustomersRouter } from './customers/customers.routes';
import { ADMIN_CUSTOMER_ROUTES } from '../../constants/adminCustomers';
import { createAdminAuditLogsRouter, createAdminSettingsRouter } from './settings/settings.routes';
import { ADMIN_AUDIT_LOG_ROUTES, ADMIN_SETTINGS_ROUTES } from '../../constants/adminSettings';
import { createAdminCampaignsRouter } from './campaigns/campaigns.routes';
import { ADMIN_CAMPAIGN_ROUTES } from '../../constants/campaigns';
import { createAdminPlacementsRouter } from './placements/placements.routes';
import { ADMIN_PLACEMENT_ROUTES } from '../../constants/placements';
import { createAdminPayoutDetailsRouter } from './payoutDetails/payoutDetails.routes';
import { ADMIN_PAYOUT_DETAILS_ROUTES } from '../../constants/payoutDetails';
import { createAdminSubscriptionsRouter } from './subscriptions/subscriptions.routes';
import { ADMIN_SUBSCRIPTION_ROUTES } from '../../constants/subscriptions';
import {
  createAdminReconciliationRouter,
  createAdminTransactionsRouter,
} from './finance/transactions.routes';
import {
  ADMIN_RECONCILIATION_ROUTES,
  ADMIN_TRANSACTION_ROUTES,
} from '../../constants/adminFinance';
import { createAdminExportsRouter } from './exports/exports.routes';
import { ADMIN_EXPORT_ROUTES } from '../../constants/exports';
import { createAdminReportsRouter } from './reports/reports.routes';
import { ADMIN_REPORT_ROUTES } from '../../constants/reports';
import { createAdminAlertsRouter } from './alerts/alerts.routes';
import { ADMIN_ALERT_ROUTES } from '../../constants/alerts';
import { createAdminAnalyticsRouter } from './analytics/analytics.routes';
import { ADMIN_ANALYTICS_ROUTES } from '../../constants/analytics';
import { createAdminPayoutsRouter } from './payouts/payouts.routes';
import { ADMIN_PAYOUT_ROUTES } from '../../constants/payouts';
import { createAdminRefundsRouter } from './refunds/refunds.routes';
import { ADMIN_REFUND_ROUTES } from '../../constants/refunds';
import { createAdminBookingsRouter } from './bookings/bookings.routes';
import { ADMIN_BOOKING_ROUTES } from '../../constants/bookings';
import { createAdminReviewsRouter } from './reviews/reviews.routes';
import { ADMIN_REVIEW_ROUTES } from '../../constants/reviews';
import { createAdminApplicationsRouter } from './applications/applications.routes';
import { createAdminCatalogRouter } from './catalog/catalog.routes';
import { createAdminBannersRouter } from './banners/banners.routes';
import { createAdminLocationsRouter } from './locations/locations.routes';
import { createAdminAuthRouter } from './auth/auth.routes';
import { createAdminProfileRouter } from './profile/profile.routes';
import { createAdminSearchRouter } from './search/search.routes';
import { createAdminSalonEditRouter } from './salonEdit/salonEdit.routes';
import { createAdminSalonInsightsRouter } from './salonInsights/salonInsights.routes';
import { createAdminCustomerExtrasRouter } from './customerExtras/customerExtras.routes';
import { ADMIN_SALON_INSIGHT_ROUTES } from '../../constants/adminSalonInsights';
import { ADMIN_SALON_EDIT_ROUTES } from '../../constants/adminSalonEdit';
import { ADMIN_SEARCH_ROUTES } from '../../constants/adminSearch';
import { ADMIN_PROFILE_ROUTES } from '../../constants/adminProfile';

/** Router for the /admin/v1 namespace. Feature routers are mounted here as they are built. */
export const createAdminRouter = (services: ApiServices = {}): Router => {
  const router = Router();
  mount(
    router,
    ADMIN_AUTH_ROUTES.base,
    createAdminAuthRouter({
      service: services.adminAuth?.service ?? unavailableAdminAuth,
      login: services.adminAuth?.login ?? unavailableAdminLogin,
      limiter: createOtpRouteLimiter(services),
    }),
  );
  mount(
    router,
    ADMIN_LOCATION_ROUTES.base,
    createAdminLocationsRouter(
      services.adminLocations ?? unavailableAdminLocations,
      services.adminGuard ?? unavailableGuard,
    ),
  );
  const content = services.adminContent ?? unavailableAdminContent;
  const guard = services.adminGuard ?? unavailableGuard;
  mount(router, ADMIN_CONTENT_ROUTES.base, createAdminContentRouter(content, guard));
  mount(router, ADMIN_APP_CONFIG_ROUTES.base, createAdminAppConfigRouter(content, guard));
  mount(
    router,
    ADMIN_BANNER_ROUTES.base,
    createAdminBannersRouter(services.adminBanners ?? unavailableAdminBanners, guard),
  );
  mount(
    router,
    ADMIN_CATALOG_ROUTES.base,
    createAdminCatalogRouter(services.adminCatalog ?? unavailableAdminCatalog, guard),
  );
  mount(
    router,
    ADMIN_APPLICATION_ROUTES.base,
    createAdminApplicationsRouter(services.adminApplications ?? unavailableSalonReview, guard),
  );
  mount(
    router,
    ADMIN_CUSTOMER_ROUTES.base,
    createAdminCustomersRouter(services.adminCustomers ?? unavailableAdminCustomers, guard),
  );
  mount(
    router,
    ADMIN_SALON_EDIT_ROUTES.base,
    createAdminSalonEditRouter(services.adminSalonEdit ?? unavailableAdminSalonEdit, guard),
  );
  mount(
    router,
    ADMIN_CUSTOMER_ROUTES.base,
    createAdminCustomerExtrasRouter(
      services.adminCustomerExtras ?? unavailableAdminCustomerExtras,
      guard,
    ),
  );
  mount(
    router,
    ADMIN_SALON_INSIGHT_ROUTES.base,
    createAdminSalonInsightsRouter(
      services.adminSalonInsights ?? unavailableAdminSalonInsights,
      guard,
    ),
  );
  mount(
    router,
    ADMIN_SEARCH_ROUTES.base,
    createAdminSearchRouter(services.adminSearch ?? unavailableAdminSearch, guard),
  );
  mount(
    router,
    ADMIN_PROFILE_ROUTES.base,
    createAdminProfileRouter(services.adminProfile ?? unavailableAdminProfile, guard),
  );
  mount(
    router,
    ADMIN_SETTINGS_ROUTES.base,
    createAdminSettingsRouter(services.adminSettings ?? unavailableAdminSettings, guard),
  );
  mount(
    router,
    ADMIN_AUDIT_LOG_ROUTES.base,
    createAdminAuditLogsRouter(services.adminSettings ?? unavailableAdminSettings, guard),
  );
  mount(
    router,
    ADMIN_CAMPAIGN_ROUTES.base,
    createAdminCampaignsRouter(services.adminCampaigns ?? unavailableCampaigns, guard),
  );
  mount(
    router,
    ADMIN_PLACEMENT_ROUTES.base,
    createAdminPlacementsRouter(services.adminPlacements ?? unavailableAdminPlacements, guard),
  );
  mount(
    router,
    ADMIN_BOOKING_ROUTES.base,
    createAdminBookingsRouter(
      services.bookingQueries ?? unavailableBookingQueries,
      guard,
      services.bookingAdmin,
    ),
  );
  mount(
    router,
    ADMIN_PAYOUT_DETAILS_ROUTES.base,
    createAdminPayoutDetailsRouter(services.payoutDetails ?? unavailablePayoutDetails, guard),
  );
  mount(
    router,
    ADMIN_SUBSCRIPTION_ROUTES.base,
    createAdminSubscriptionsRouter(
      services.adminSubscriptions ?? unavailableAdminSubscriptions,
      guard,
    ),
  );
  mount(
    router,
    ADMIN_EXPORT_ROUTES.base,
    createAdminExportsRouter(services.adminExports ?? unavailableAdminExports, guard),
  );
  mount(
    router,
    ADMIN_REPORT_ROUTES.base,
    createAdminReportsRouter(services.adminReports ?? unavailableAdminReports, guard),
  );
  mount(
    router,
    ADMIN_ALERT_ROUTES.base,
    createAdminAlertsRouter(services.adminAlerts ?? unavailableAdminAlerts, guard),
  );
  mount(
    router,
    ADMIN_ANALYTICS_ROUTES.base,
    createAdminAnalyticsRouter(services.adminAnalytics ?? unavailableAdminAnalytics, guard),
  );
  mount(
    router,
    ADMIN_TRANSACTION_ROUTES.base,
    createAdminTransactionsRouter(
      services.adminTransactions ?? unavailableAdminTransactions,
      guard,
    ),
  );
  mount(
    router,
    ADMIN_RECONCILIATION_ROUTES.base,
    createAdminReconciliationRouter(
      services.adminTransactions ?? unavailableAdminTransactions,
      guard,
    ),
  );
  mount(
    router,
    ADMIN_PAYOUT_ROUTES.base,
    createAdminPayoutsRouter(services.adminPayouts ?? unavailableAdminPayouts, guard),
  );
  mount(
    router,
    ADMIN_REFUND_ROUTES.base,
    createAdminRefundsRouter(services.adminRefunds ?? unavailableAdminRefunds, guard),
  );
  mount(
    router,
    ADMIN_REVIEW_ROUTES.base,
    createAdminReviewsRouter(services.adminReviews ?? unavailableAdminReviews, guard),
  );
  mount(
    router,
    ADMIN_SALON_STATE_ROUTES.base,
    createAdminSalonStateRouter(services.salonState ?? unavailableSalonState, guard),
  );
  mount(router, UPLOAD_ROUTES.base, createAdminUploadsRouter(services));
  mount(
    router,
    ADMIN_CATALOG_REQUEST_ROUTES.base,
    createAdminCatalogRequestsRouter(services.catalogRequests ?? unavailableCatalogRequests, guard),
  );
  mount(
    router,
    ADMIN_SALON_STATE_ROUTES.base,
    createAdminSalonsRouter(services.adminSalons ?? unavailableAdminSalons, guard),
  );
  return router;
};
