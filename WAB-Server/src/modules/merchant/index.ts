import { Router } from 'express';
import { MERCHANT_AUTH_ROUTES } from '../../constants/merchantAuth';
import { OTP_ROUTES } from '../../constants/otp';
import { INSTALLATION_ROUTES } from '../../constants/installations';
import { APP_CONFIG_ROUTES } from '../../constants/appConfig';
import { LOCATION_ROUTES } from '../../constants/locations';
import { CONTENT_ROUTES } from '../../constants/content';
import { CATALOG_ROUTES } from '../../constants/catalog';
import { MERCHANT_TEAM_ROUTES } from '../../constants/team';
import {
  MERCHANT_CATALOG_REQUEST_ROUTES,
  MERCHANT_SERVICES_ROUTES,
} from '../../constants/salonServices';
import { MERCHANT_HOURS_ROUTES } from '../../constants/hours';
import { MERCHANT_GALLERY_ROUTES } from '../../constants/gallery';
import { MERCHANT_POLICY_ROUTES, MERCHANT_SALON_ROUTES } from '../../constants/salon';
import { UPLOAD_ROUTES } from '../../constants/uploads';
import { mount } from '../../routes/mount';
import { createMerchantUploadsRouter } from '../shared/uploads';
import { createMerchantAppConfigRouter } from '../shared/appConfig';
import { createMerchantInstallationsRouter } from '../shared/installations';
import {
  unavailableCatalogRequests,
  unavailableCatalogService,
  unavailableBookingActions,
  unavailableGallery,
  unavailableHours,
  unavailableSalonServices,
  unavailableLeaves,
  unavailablePolicy,
  unavailableStaff,
  unavailableTeam,
  unavailableGuard,
  unavailableMerchantAuth,
  unavailableSalonApplication,
  unavailableSalonProfile,
  type ApiServices,
} from '../services';
import { createMerchantContentRouter } from '../shared/content';
import { createCatalogRouter } from '../shared/catalog/catalog.module';
import { createLocationsRouterFor } from '../shared/locations';
import { createMerchantOtpRouter, createOtpRouteLimiter } from '../shared/otp';
import { createMerchantCatalogRequestsRouter } from './catalogRequests/requests.routes';
import { createMerchantPolicyRouter } from './policy/policy.routes';
import { createMerchantLeavesRouter } from './team/leaves.routes';
import { createMerchantStaffRouter } from './team/staff.routes';
import { createMerchantTeamRouter } from './team/team.routes';
import { createMerchantServicesRouter } from './services/services.routes';
import { createMerchantHoursRouter } from './hours/hours.routes';
import { createMerchantBookingsRouter } from './bookings/bookings.routes';
import { MERCHANT_BOOKING_ROUTES } from '../../constants/bookings';
import { createMerchantGalleryRouter } from './gallery/gallery.routes';
import { createMerchantProfileRouter } from './salon/profile.routes';
import { createMerchantSalonRouter } from './salon/salon.routes';
import { createMerchantAuthRouter } from './auth/auth.routes';

/** Router for the /merchant/v1 namespace. Feature routers are mounted here as they are built. */
export const createMerchantRouter = (services: ApiServices = {}): Router => {
  const router = Router();
  mount(router, OTP_ROUTES.base, createMerchantOtpRouter(services));
  mount(
    router,
    MERCHANT_AUTH_ROUTES.base,
    createMerchantAuthRouter({
      service: services.merchantAuth ?? unavailableMerchantAuth,
      limiter: createOtpRouteLimiter(services),
    }),
  );
  mount(router, INSTALLATION_ROUTES.base, createMerchantInstallationsRouter(services));
  mount(router, APP_CONFIG_ROUTES.base, createMerchantAppConfigRouter(services));
  mount(router, LOCATION_ROUTES.base, createLocationsRouterFor(services));
  mount(router, CONTENT_ROUTES.base, createMerchantContentRouter(services));
  mount(
    router,
    CATALOG_ROUTES.base,
    createCatalogRouter(
      services.catalog ?? unavailableCatalogService,
      createOtpRouteLimiter(services),
    ),
  );
  mount(
    router,
    MERCHANT_SALON_ROUTES.base,
    createMerchantSalonRouter({
      service: services.salonApplication?.service ?? unavailableSalonApplication,
      limiter: createOtpRouteLimiter(services),
      guard: services.salonApplication?.guard ?? unavailableGuard,
    }),
  );
  mount(
    router,
    MERCHANT_SALON_ROUTES.base,
    createMerchantProfileRouter(
      services.salonProfile?.service ?? unavailableSalonProfile,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(router, UPLOAD_ROUTES.base, createMerchantUploadsRouter(services));
  mount(
    router,
    MERCHANT_BOOKING_ROUTES.base,
    createMerchantBookingsRouter(
      services.bookingActions ?? unavailableBookingActions,
      services.salonProfile?.guard ?? [unavailableGuard],
      services.bookingReassign,
      services.bookingQueries,
      services.bookingBulk,
    ),
  );
  mount(
    router,
    MERCHANT_GALLERY_ROUTES.base,
    createMerchantGalleryRouter(
      services.gallery ?? unavailableGallery,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_HOURS_ROUTES.base,
    createMerchantHoursRouter(
      services.hours ?? unavailableHours,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_SERVICES_ROUTES.base,
    createMerchantServicesRouter(
      services.salonServices ?? unavailableSalonServices,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_CATALOG_REQUEST_ROUTES.base,
    createMerchantCatalogRequestsRouter(
      services.catalogRequests ?? unavailableCatalogRequests,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_TEAM_ROUTES.base,
    createMerchantTeamRouter(
      services.team ?? unavailableTeam,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_TEAM_ROUTES.base,
    createMerchantStaffRouter(
      services.staff ?? unavailableStaff,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_TEAM_ROUTES.base,
    createMerchantLeavesRouter(
      services.leaves ?? unavailableLeaves,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_POLICY_ROUTES.base,
    createMerchantPolicyRouter(
      services.policy ?? unavailablePolicy,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  return router;
};
