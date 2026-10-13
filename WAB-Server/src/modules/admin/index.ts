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
  unavailableAdminSubscriptions,
  unavailableAdminRefunds,
  unavailableBookingQueries,
} from '../services';
import { createOtpRouteLimiter } from '../shared/otp';
import { createAdminAppConfigRouter, createAdminContentRouter } from './content/content.routes';
import { createAdminCatalogRequestsRouter } from './catalogRequests/requests.routes';
import { createAdminSalonsRouter } from './salons/adminSalons.routes';
import { createAdminSalonStateRouter } from './salons/salonState.routes';
import { createAdminPlacementsRouter } from './placements/placements.routes';
import { ADMIN_PLACEMENT_ROUTES } from '../../constants/placements';
import { createAdminSubscriptionsRouter } from './subscriptions/subscriptions.routes';
import { ADMIN_SUBSCRIPTION_ROUTES } from '../../constants/subscriptions';
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
    ADMIN_SUBSCRIPTION_ROUTES.base,
    createAdminSubscriptionsRouter(
      services.adminSubscriptions ?? unavailableAdminSubscriptions,
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
