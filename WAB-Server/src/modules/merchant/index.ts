import { scopeToBranch } from '../../middlewares/branchScope';
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
import { MERCHANT_BRANCH_ROUTES } from '../../constants/branches';
import { MERCHANT_GALLERY_ROUTES } from '../../constants/gallery';
import { createMerchantFinanceRouter } from './finance/finance.routes';
import { createMerchantReviewsRouter } from './reviews/reviews.routes';
import { createMerchantStatisticsRouter } from './statistics/statistics.routes';
import { createMerchantDashboardRouter } from './dashboard/dashboard.routes';
import { MERCHANT_DASHBOARD_ROUTES } from '../../constants/dashboard';
import { MERCHANT_STATISTICS_ROUTES } from '../../constants/statistics';
import { MERCHANT_REVIEW_ROUTES } from '../../constants/reviews';
import { MERCHANT_FINANCE_ROUTES, MERCHANT_SUBSCRIPTION_ROUTES } from '../../constants/finance';
import { createMerchantPayoutDetailsRouter } from './payoutDetails/payoutDetails.routes';
import {
  MERCHANT_PAYOUT_DETAILS_ROUTES,
  PAYOUT_DETAILS_RATE_LIMIT,
} from '../../constants/payoutDetails';
import { MERCHANT_POLICY_ROUTES, MERCHANT_SALON_ROUTES } from '../../constants/salon';
import { UPLOAD_ROUTES } from '../../constants/uploads';
import { ROUTE_LIMIT_FAMILIES } from '../../constants/security';
import { createBrowseRouteLimiter, createRouteLimiter } from '../shared/rateLimits';
import { mount } from '../../routes/mount';
import { createMerchantUploadsRouter } from '../shared/uploads';
import { createMerchantAppConfigRouter } from '../shared/appConfig';
import { NOTIFICATION_ROUTES } from '../../constants/notifications';
import { createNotificationsRouter } from '../shared/notifications/notifications.routes';
import { createMerchantInstallationsRouter } from '../shared/installations';
import {
  unavailableCatalogRequests,
  unavailableCatalogService,
  unavailableBookingActions,
  unavailableMerchantFinance,
  unavailableMerchantReviews,
  unavailableMerchantStatistics,
  unavailableMerchantDashboard,
  unavailableMemberSelf,
  unavailableAdminSalonInsights,
  unavailablePayoutDetails,
  unavailableBranches,
  unavailableGallery,
  unavailableHours,
  unavailableSalonServices,
  unavailableLeaves,
  unavailablePolicy,
  unavailableStaff,
  unavailableTeam,
  unavailableGuard,
  unavailableInbox,
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
import { createMerchantBranchesRouter } from './branches/branches.routes';
import { createMerchantGalleryRouter } from './gallery/gallery.routes';
import { createMerchantProfileRouter } from './salon/profile.routes';
import { createMerchantSalonRouter } from './salon/salon.routes';
import { createMerchantAuthRouter } from './auth/auth.routes';
import { createMerchantChangePhoneRouter, createMerchantMeRouter } from './me/me.routes';
import { createSalonDeletionRequestRouter } from './salon/deletion.routes';
import { MERCHANT_ME_ROUTES } from '../../constants/merchantAuth';

/** Router for the /merchant/v1 namespace. Feature routers are mounted here as they are built. */
export const createMerchantRouter = (services: ApiServices = {}): Router => {
  const router = Router();
  mount(router, OTP_ROUTES.base, createMerchantOtpRouter(services));
  mount(
    router,
    MERCHANT_AUTH_ROUTES.base,
    createMerchantAuthRouter({
      service: services.merchantAuth ?? unavailableMerchantAuth,
      limiter: createOtpRouteLimiter(services, 'merchant'),
    }),
  );
  mount(
    router,
    MERCHANT_AUTH_ROUTES.base,
    createMerchantChangePhoneRouter(
      services.memberSelf ?? unavailableMemberSelf,
      services.salonProfile?.guard ?? [unavailableGuard],
      createOtpRouteLimiter(services, 'merchant'),
    ),
  );
  mount(
    router,
    MERCHANT_SALON_ROUTES.base,
    createSalonDeletionRequestRouter(
      services.salonDeletion ?? unavailableAdminSalonInsights.deletion,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_ME_ROUTES.base,
    createMerchantMeRouter(
      services.memberSelf ?? unavailableMemberSelf,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(router, INSTALLATION_ROUTES.base, createMerchantInstallationsRouter(services));
  mount(router, APP_CONFIG_ROUTES.base, createMerchantAppConfigRouter(services));
  mount(router, LOCATION_ROUTES.base, createLocationsRouterFor(services, 'merchant'));
  mount(router, CONTENT_ROUTES.base, createMerchantContentRouter(services));
  mount(
    router,
    CATALOG_ROUTES.base,
    createCatalogRouter(
      services.catalog ?? unavailableCatalogService,
      createBrowseRouteLimiter(services, 'merchant'),
    ),
  );
  mount(
    router,
    MERCHANT_SALON_ROUTES.base,
    createMerchantSalonRouter({
      service: services.salonApplication?.service ?? unavailableSalonApplication,
      limiter: createOtpRouteLimiter(services, 'merchant'),
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
  mount(
    router,
    NOTIFICATION_ROUTES.base,
    createNotificationsRouter({
      service: services.inbox ?? unavailableInbox,
      recipientType: 'MEMBER',
      guard: services.salonProfile?.guard ?? [unavailableGuard],
      limiter: createBrowseRouteLimiter(services, 'merchant'),
    }),
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
    MERCHANT_BRANCH_ROUTES.base,
    createMerchantBranchesRouter(
      services.branches ?? unavailableBranches,
      services.salonProfile?.guard ?? [unavailableGuard],
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
  // The same routers addressed to one branch (§3.3a): owner any branch, manager their own.
  const branchScoped = (child: Router): Router => {
    const scoped = Router({ mergeParams: true });
    scoped.use(scopeToBranch);
    mount(scoped, '', child);
    return scoped;
  };
  mount(
    router,
    MERCHANT_BRANCH_ROUTES.hours,
    branchScoped(
      createMerchantHoursRouter(
        services.hours ?? unavailableHours,
        services.salonProfile?.guard ?? [unavailableGuard],
      ),
    ),
  );
  mount(
    router,
    MERCHANT_BRANCH_ROUTES.services,
    branchScoped(
      createMerchantServicesRouter(
        services.salonServices ?? unavailableSalonServices,
        services.salonProfile?.guard ?? [unavailableGuard],
      ),
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
  const finance = createMerchantFinanceRouter(
    services.merchantFinance ?? unavailableMerchantFinance,
    services.salonProfile?.guard ?? [unavailableGuard],
  );
  mount(router, MERCHANT_FINANCE_ROUTES.base, finance.finance);
  mount(
    router,
    MERCHANT_REVIEW_ROUTES.base,
    createMerchantReviewsRouter(
      services.merchantReviews ?? unavailableMerchantReviews,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_STATISTICS_ROUTES.base,
    createMerchantStatisticsRouter(
      services.merchantStatistics ?? unavailableMerchantStatistics,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(
    router,
    MERCHANT_DASHBOARD_ROUTES.base,
    createMerchantDashboardRouter(
      services.merchantDashboard ?? unavailableMerchantDashboard,
      services.salonProfile?.guard ?? [unavailableGuard],
    ),
  );
  mount(router, MERCHANT_SUBSCRIPTION_ROUTES.base, finance.subscription);
  mount(
    router,
    MERCHANT_PAYOUT_DETAILS_ROUTES.base,
    createMerchantPayoutDetailsRouter(
      services.payoutDetails ?? unavailablePayoutDetails,
      services.salonProfile?.guard ?? [unavailableGuard],
      createRouteLimiter(
        services,
        'merchant',
        ROUTE_LIMIT_FAMILIES.payoutDetails,
        PAYOUT_DETAILS_RATE_LIMIT,
      ),
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
