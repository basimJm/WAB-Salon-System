import { Router } from 'express';
import { CUSTOMER_AUTH_ROUTES } from '../../constants/customerAuth';
import { OTP_ROUTES } from '../../constants/otp';
import { INSTALLATION_ROUTES } from '../../constants/installations';
import { APP_CONFIG_ROUTES } from '../../constants/appConfig';
import { SEARCH_ROUTES } from '../../constants/search';
import { ROUTE_LIMIT_FAMILIES } from '../../constants/security';
import { createBrowseRouteLimiter, createRouteLimiter } from '../shared/rateLimits';
import { LOCATION_ROUTES } from '../../constants/locations';
import { CONTENT_ROUTES } from '../../constants/content';
import { BANNER_ROUTES } from '../../constants/banners';
import { CATALOG_ROUTES } from '../../constants/catalog';
import { UPLOAD_ROUTES } from '../../constants/uploads';
import { mount } from '../../routes/mount';
import { createCustomerUploadsRouter } from '../shared/uploads';
import { createCustomerAppConfigRouter } from '../shared/appConfig';
import { createCustomerInstallationsRouter } from '../shared/installations';
import { ExternalServiceError } from '../../utils/errors';
import {
  unavailableCatalogService,
  unavailableBannersService,
  unavailableGuard,
  unavailableSalonDetails,
  unavailableFavorites,
  unavailableInbox,
  unavailableCustomerProfile,
  unavailableAvailability,
  unavailableBookingDrafts,
  unavailableBookings,
  unavailablePayments,
  unavailableHome,
  unavailableReviews,
  unavailableSearch,
  unavailableCustomerAuth,
  type ApiServices,
} from '../services';
import { createCustomerBannersRouter } from './banners/banners.module';
import { createSalonDetailsRouter } from './salonDetails/salonDetails.routes';
import { SALON_DETAILS_ROUTES } from '../../constants/salonDetails';
import { NOTIFICATION_ROUTES } from '../../constants/notifications';
import { createNotificationsRouter } from '../shared/notifications/notifications.routes';
import { createFavoritesRouter } from './favorites/favorites.routes';
import { FAVORITE_ROUTES } from '../../constants/favorites';
import { createReviewsRouter } from './reviews/reviews.routes';
import { createCustomerProfileRouter } from './profile/profile.routes';
import { CUSTOMER_PROFILE_ROUTES } from '../../constants/customerProfile';
import { createPaymentsRouter } from './payments/payments.routes';
import { PAYMENT_RATE_LIMIT, PAYMENT_ROUTES } from '../../constants/payments';
import { createBookingsRouter } from './bookings/bookings.routes';
import { BOOKING_RATE_LIMIT, BOOKING_ROUTES } from '../../constants/bookings';
import { createBookingDraftsRouter } from './bookingDrafts/drafts.routes';
import { BOOKING_DRAFT_RATE_LIMIT, BOOKING_DRAFT_ROUTES } from '../../constants/bookingDrafts';
import { createAvailabilityRouter } from './availability/availability.routes';
import { createHomeRouter } from './home/home.routes';
import { HOME_ROUTES } from '../../constants/home';
import { createSearchRouter } from './search/search.routes';
import { createCustomerContentRouter } from '../shared/content';
import { createCatalogRouter } from '../shared/catalog/catalog.module';
import { createLocationsRouterFor } from '../shared/locations';
import { createOtpRouteLimiter, createCustomerOtpRouter } from '../shared/otp';
import { createCustomerAuthRouter } from './auth/auth.routes';

/** Router for the /customer/v1 namespace. Feature routers are mounted here as they are built. */
export const createCustomerRouter = (services: ApiServices = {}): Router => {
  const router = Router();
  mount(router, OTP_ROUTES.base, createCustomerOtpRouter(services));
  mount(
    router,
    CUSTOMER_AUTH_ROUTES.base,
    createCustomerAuthRouter({
      service: services.customerAuth?.service ?? unavailableCustomerAuth,
      limiter: createOtpRouteLimiter(services, 'customer'),
      authenticate:
        services.customerAuth?.authenticate ??
        ((_req, _res, next): void => {
          next(new ExternalServiceError({ unavailable: true }));
        }),
    }),
  );
  mount(router, INSTALLATION_ROUTES.base, createCustomerInstallationsRouter(services));
  mount(router, APP_CONFIG_ROUTES.base, createCustomerAppConfigRouter(services));
  mount(router, LOCATION_ROUTES.base, createLocationsRouterFor(services, 'customer'));
  mount(router, CONTENT_ROUTES.base, createCustomerContentRouter(services));
  mount(
    router,
    BANNER_ROUTES.base,
    createCustomerBannersRouter(
      services.banners ?? unavailableBannersService,
      createBrowseRouteLimiter(services, 'customer'),
    ),
  );
  mount(
    router,
    CATALOG_ROUTES.base,
    createCatalogRouter(
      services.catalog ?? unavailableCatalogService,
      createBrowseRouteLimiter(services, 'customer'),
    ),
  );
  mount(router, UPLOAD_ROUTES.base, createCustomerUploadsRouter(services));
  mount(
    router,
    SEARCH_ROUTES.base,
    createSearchRouter({
      service: services.search ?? unavailableSearch,
      optionalAuth: services.installations?.customerOptional ?? unavailableGuard,
      limiter: createBrowseRouteLimiter(services, 'customer'),
    }),
  );
  mount(
    router,
    SALON_DETAILS_ROUTES.base,
    createSalonDetailsRouter({
      service: services.salonDetails ?? unavailableSalonDetails,
      optionalAuth: services.installations?.customerOptional ?? unavailableGuard,
      limiter: createBrowseRouteLimiter(services, 'customer'),
    }),
  );
  mount(
    router,
    HOME_ROUTES.base,
    createHomeRouter({
      service: services.home ?? unavailableHome,
      optionalAuth: services.installations?.customerOptional ?? unavailableGuard,
      limiter: createBrowseRouteLimiter(services, 'customer'),
    }),
  );
  mount(
    router,
    FAVORITE_ROUTES.base,
    createFavoritesRouter({
      service: services.favorites ?? unavailableFavorites,
      guard: services.installations?.customerRequired ?? unavailableGuard,
      limiter: createBrowseRouteLimiter(services, 'customer'),
    }),
  );
  mount(
    router,
    NOTIFICATION_ROUTES.base,
    createNotificationsRouter({
      service: services.inbox ?? unavailableInbox,
      recipientType: 'CUSTOMER',
      guard: services.installations?.customerRequired ?? unavailableGuard,
      limiter: createBrowseRouteLimiter(services, 'customer'),
    }),
  );
  mount(
    router,
    SALON_DETAILS_ROUTES.base,
    createReviewsRouter({
      service: services.reviews ?? unavailableReviews,
      guard: services.installations?.customerRequired ?? unavailableGuard,
      limiter: createBrowseRouteLimiter(services, 'customer'),
    }),
  );
  mount(
    router,
    CUSTOMER_PROFILE_ROUTES.base,
    createCustomerProfileRouter({
      service: services.customerProfile ?? unavailableCustomerProfile,
      guard: services.installations?.customerRequired ?? unavailableGuard,
      limiter: createBrowseRouteLimiter(services, 'customer'),
    }),
  );
  mount(
    router,
    SALON_DETAILS_ROUTES.base,
    createAvailabilityRouter({
      service: services.availability ?? unavailableAvailability,
      guard: services.installations?.customerRequired ?? unavailableGuard,
      limiter: createBrowseRouteLimiter(services, 'customer'),
    }),
  );
  mount(
    router,
    BOOKING_DRAFT_ROUTES.base,
    createBookingDraftsRouter({
      service: services.bookingDrafts ?? unavailableBookingDrafts,
      guard: services.installations?.customerRequired ?? unavailableGuard,
      limiter: createRouteLimiter(
        services,
        'customer',
        ROUTE_LIMIT_FAMILIES.bookingDraft,
        BOOKING_DRAFT_RATE_LIMIT,
      ),
    }),
  );
  mount(
    router,
    BOOKING_ROUTES.base,
    createBookingsRouter({
      service: services.bookings ?? unavailableBookings,
      ...(services.bookingCancel === undefined ? {} : { cancel: services.bookingCancel }),
      ...(services.bookingQueries === undefined ? {} : { queries: services.bookingQueries }),
      guard: services.installations?.customerRequired ?? unavailableGuard,
      limiter: createRouteLimiter(
        services,
        'customer',
        ROUTE_LIMIT_FAMILIES.booking,
        BOOKING_RATE_LIMIT,
      ),
    }),
  );
  mount(
    router,
    PAYMENT_ROUTES.base,
    createPaymentsRouter({
      service: services.payments ?? unavailablePayments,
      guard: services.installations?.customerRequired ?? unavailableGuard,
      limiter: createRouteLimiter(
        services,
        'customer',
        ROUTE_LIMIT_FAMILIES.payment,
        PAYMENT_RATE_LIMIT,
      ),
    }),
  );
  return router;
};
