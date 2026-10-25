import type { ExportsService } from '../domain/exports/exports.service';
import type { ReportsService } from '../domain/reports/reports.service';
import type { AlertInbox } from '../domain/alerts/alertInbox.service';
import type { AnalyticsService } from '../domain/analytics/analytics.service';
import type { AdminTransactionsService } from '../domain/finance/adminTransactions.service';
import type { RequestHandler } from 'express';
import type { Store } from 'express-rate-limit';
import type { InstallationService } from '../domain/installations/installations.service';
import type { AdminLoginService } from '../domain/auth/adminLogin.service';
import type { AdminAuthService } from '../domain/auth/adminAuth.service';
import type { MerchantAuthService } from '../domain/auth/merchantAuth.service';
import type { CustomerAuthService } from '../domain/auth/customerAuth.service';
import type { AppConfigService } from '../domain/appConfig';
import type { LocationsService } from '../domain/locations';
import type { ContentService } from '../domain/content';
import type { AdminLocationServices } from './admin/locations/locations.routes';
import type { SalonDetailsService } from '../domain/salonDetails/salonDetails.service';
import type { InboxService } from '../domain/notifications/inbox.service';
import type { FavoritesService } from '../domain/favorites/favorites.service';
import type { AdminCustomersService } from '../domain/customers/adminCustomers.service';
import type { AdminSettingsService } from '../domain/adminSettings/adminSettings.service';
import type { AdminProfileService } from '../domain/adminProfile/adminProfile.service';
import type { AdminSearchService } from '../domain/adminSearch/adminSearch.service';
import type { AdminSalonEditService } from '../domain/adminSalonEdit/adminSalonEdit.service';
import type { AdminBranchesService } from '../domain/branches/adminBranches.service';
import type { BookingAdminExtrasService } from '../domain/bookings/bookingAdminExtras.service';
import type { AdminCustomerExtrasService } from '../domain/customers/adminCustomerExtras.service';
import type { SalonDeletionService } from '../domain/salons/salonDeletion.service';
import type { SalonInsightsService } from '../domain/salons/salonInsights.service';
import type { CampaignsService } from '../domain/campaigns/campaigns.service';
import type { PlacementsService } from '../domain/placements/placements.service';
import type { AdminReviewsService } from '../domain/reviews/adminReviews.service';
import type { ReviewsService } from '../domain/reviews/reviews.service';
import type { CustomerProfileService } from '../domain/customers/customerProfile.service';
import type { BookingActionsService } from '../domain/bookings/bookingActions.service';
import type { MerchantFinanceService } from '../domain/finance/merchantFinance.service';
import type { MerchantReviewsService } from '../domain/reviews/merchantReviews.service';
import type { MerchantStatisticsService } from '../domain/statistics/merchantStatistics.service';
import type { MerchantDashboardService } from '../domain/dashboard/merchantDashboard.service';
import type { MemberSelfService } from '../domain/team/memberSelf.service';
import type { PayoutDetailsService } from '../domain/salons/payoutDetails.service';
import type { SubscriptionsService } from '../domain/subscriptions/subscriptions.service';
import type { PayoutsService } from '../domain/payouts/payouts.service';
import type { RefundService } from '../domain/refunds/refunds.service';
import type { PaymentsService } from '../domain/payments/payments.service';
import type { BookingAdminService } from '../domain/bookings/bookingAdmin.service';
import type { BookingBulkService } from '../domain/bookings/bookingBulk.service';
import type { BookingCancelService } from '../domain/bookings/bookingCancel.service';
import type { BookingQueriesService } from '../domain/bookings/bookingQueries.service';
import type { BookingReassignService } from '../domain/bookings/bookingReassign.service';
import type { BookingCreationService } from '../domain/bookings/bookingCreation.service';
import type { BookingDraftService } from '../domain/bookings/bookingDraft.service';
import type { AvailabilityService } from '../domain/availability/availability.service';
import type { HomeService } from '../domain/home/home.service';
import type { SearchService } from '../domain/search/search.service';
import type { AdminSalonsService } from '../domain/salons/adminSalons.service';
import type { PolicyService } from '../domain/salons/policy.service';
import type { LeavesService } from '../domain/team/leaves.service';
import type { StaffService } from '../domain/team/staff.service';
import type { TeamService } from '../domain/team/team.service';
import type { CatalogRequestsService } from '../domain/catalog/catalogRequests.service';
import type { SalonServicesService } from '../domain/salonServices/salonServices.service';
import type { HoursService } from '../domain/salons/hoursService';
import type { BranchesService } from '../domain/branches/branches.service';
import type { GalleryService } from '../domain/gallery/gallery.service';
import type { UploadsService } from '../domain/uploads/uploads.service';
import type { SalonProfileService } from '../domain/salons/salonProfile.service';
import type { SalonStateService } from '../domain/salons/salonState.service';
import type { SalonReviewService } from '../domain/salons/salonReview.service';
import type { SalonApplicationService } from '../domain/salons/salonApplication.service';
import type { CatalogServiceRaw } from '../models/catalogService.model';
import type { CatalogService } from '../domain/catalog';
import type { BannerRaw } from '../models/banner.model';
import type { BannersService } from '../domain/banners';
import type { AdminContentServices } from '../domain/adminCrud/content';
import type { AdminCrudService } from '../domain/adminCrud/adminCrud.service';
import type { OtpGate } from '../domain/otp/otpGate.service';
import { ExternalServiceError } from '../utils/errors';

/** Long-lived services the feature routers need. `server.ts` builds them once Redis is connected. */
export interface ApiServices {
  /** Closes provider connections (SMTP pool, push client) on shutdown. */
  readonly providersClose?: () => Promise<void>;
  readonly otpGate?: OtpGate;
  readonly appConfig?: AppConfigService;
  readonly locations?: LocationsService;
  /** `requireAuth('admin', secret)`: every admin resource route sits behind it. */
  readonly adminGuard?: RequestHandler;
  readonly adminLocations?: AdminLocationServices;
  readonly adminContent?: AdminContentServices;
  readonly banners?: BannersService;
  readonly adminApplications?: SalonReviewService;
  readonly adminReviews?: AdminReviewsService;
  readonly adminPlacements?: PlacementsService;
  readonly adminCampaigns?: CampaignsService;
  readonly adminSettings?: AdminSettingsService;
  readonly adminProfile?: AdminProfileService;
  readonly adminSearch?: AdminSearchService;
  readonly adminSalonEdit?: AdminSalonEditService;
  readonly adminBranches?: AdminBranchesService;
  readonly adminCustomerExtras?: AdminCustomerExtrasService;
  readonly bookingAdminExtras?: BookingAdminExtrasService;
  readonly adminSalonInsights?: {
    readonly insights: SalonInsightsService;
    readonly deletion: SalonDeletionService;
  };
  readonly adminCustomers?: AdminCustomersService;
  readonly salonState?: SalonStateService;
  readonly adminSalons?: AdminSalonsService;
  readonly salonDetails?: SalonDetailsService;
  readonly home?: HomeService;
  readonly availability?: AvailabilityService;
  readonly bookingDrafts?: BookingDraftService;
  readonly bookings?: BookingCreationService;
  readonly bookingCancel?: BookingCancelService;
  readonly payments?: PaymentsService;
  readonly adminRefunds?: RefundService;
  readonly adminPayouts?: PayoutsService;
  readonly adminTransactions?: AdminTransactionsService;
  readonly adminAnalytics?: AnalyticsService;
  readonly adminAlerts?: AlertInbox;
  readonly adminReports?: ReportsService;
  readonly adminExports?: ExportsService;
  readonly payoutDetails?: PayoutDetailsService;
  readonly merchantFinance?: MerchantFinanceService;
  readonly merchantReviews?: MerchantReviewsService;
  readonly merchantStatistics?: MerchantStatisticsService;
  readonly merchantDashboard?: MerchantDashboardService;
  readonly memberSelf?: MemberSelfService;
  /** Owner deletion requests (merchant) and admin decisions share one service. */
  readonly salonDeletion?: SalonDeletionService;
  readonly adminSubscriptions?: SubscriptionsService;
  readonly bookingBulk?: BookingBulkService;
  readonly bookingAdmin?: BookingAdminService;
  readonly bookingQueries?: BookingQueriesService;
  readonly bookingReassign?: BookingReassignService;
  readonly bookingActions?: BookingActionsService;
  readonly customerProfile?: CustomerProfileService;
  readonly reviews?: ReviewsService;
  readonly favorites?: FavoritesService;
  /** In-app notification list for both apps (S19, M24). */
  readonly inbox?: InboxService;
  readonly search?: SearchService;
  readonly uploads?: UploadsService;
  readonly gallery?: GalleryService;
  /** Salon branches (§5.16): owner management in the merchant app. */
  readonly branches?: BranchesService;
  readonly hours?: HoursService;
  readonly salonServices?: SalonServicesService;
  readonly catalogRequests?: CatalogRequestsService;
  readonly team?: TeamService;
  readonly staff?: StaffService;
  readonly leaves?: LeavesService;
  readonly policy?: PolicyService;
  /** Salon profile; `guard` = `requireAuth('merchant')` then `loadMember`. */
  readonly salonProfile?: {
    readonly service: SalonProfileService;
    readonly guard: readonly RequestHandler[];
  };
  /** Salon application (M05-M06); the guard is `merchantRequired` of `installations`. */
  readonly salonApplication?: {
    readonly service: SalonApplicationService;
    readonly guard: RequestHandler;
  };
  readonly catalog?: CatalogService;
  readonly adminCatalog?: AdminCrudService<CatalogServiceRaw>;
  readonly adminBanners?: AdminCrudService<BannerRaw>;
  readonly content?: { readonly customer: ContentService; readonly merchant: ContentService };
  readonly merchantAuth?: MerchantAuthService;
  readonly installations?: {
    readonly service: InstallationService;
    /** Customer app: guests allowed, a present token must be valid. */
    readonly customerOptional: RequestHandler;
    readonly customerRequired: RequestHandler;
    readonly merchantRequired: RequestHandler;
  };
  readonly adminAuth?: { readonly service: AdminAuthService; readonly login: AdminLoginService };
  readonly customerAuth?: {
    readonly service: CustomerAuthService;
    /** `requireAuth('customer', secret)`. */
    readonly authenticate: RequestHandler;
  };
  /**
   * Shared store per route-limit scope (`<namespace>:<family>`, SRV-151); without it each instance
   * counts on its own in memory.
   */
  readonly rateLimitStoreFor?: (scope: string) => Store;
}

const unavailable = (): Promise<never> =>
  Promise.reject(new ExternalServiceError({ unavailable: true }));

/** Stands in when no Redis-backed gate exists (tests without Redis): the route answers 503, not 404. */
export const unavailableOtpGate: OtpGate = {
  request: unavailable,
  reportWrongAttempt: unavailable,
  assertNotBlocked: unavailable,
  reset: unavailable,
};

const unavailableCustomerAuthError = (): Promise<never> =>
  Promise.reject(new ExternalServiceError({ unavailable: true }));

export const unavailableCustomerAuth: CustomerAuthService = {
  checkPhone: unavailableCustomerAuthError,
  register: unavailableCustomerAuthError,
  login: unavailableCustomerAuthError,
  refresh: unavailableCustomerAuthError,
  logout: unavailableCustomerAuthError,
  changePhone: unavailableCustomerAuthError,
};

export const unavailableMerchantAuth: MerchantAuthService = {
  checkPhone: unavailableCustomerAuthError,
  login: unavailableCustomerAuthError,
  refresh: unavailableCustomerAuthError,
  logout: unavailableCustomerAuthError,
};

export const unavailableAdminAuth: AdminAuthService = {
  identify: unavailableCustomerAuthError,
  recordSecondFactorFailure: unavailableCustomerAuthError,
  verifyCredentials: unavailableCustomerAuthError,
  openSession: unavailableCustomerAuthError,
  refresh: unavailableCustomerAuthError,
  logout: unavailableCustomerAuthError,
};

export const unavailableAdminLogin: AdminLoginService = {
  start: unavailableCustomerAuthError,
  verify: unavailableCustomerAuthError,
};

export const unavailableInstallationService: InstallationService = {
  register: unavailableCustomerAuthError,
  setPushEnabled: unavailableCustomerAuthError,
  setMemberPushEnabled: unavailableCustomerAuthError,
};

export const unavailableAppConfigService: AppConfigService = { get: unavailable };

export const unavailableLocationsService: LocationsService = {
  countries: unavailable,
  cities: unavailable,
  areas: unavailable,
};

export const unavailableContentService: ContentService = {
  page: unavailable,
  faqs: unavailable,
};

/** Stands in for `requireAuth` when the server has no auth wiring (tests): the route answers 503. */
export const unavailableGuard: RequestHandler = (_req, _res, next) => {
  next(new ExternalServiceError({ unavailable: true }));
};

const unavailableCrud: AdminCrudService<never> = {
  list: unavailable,
  get: unavailable,
  create: unavailable,
  update: unavailable,
};

export const unavailableAdminLocations: AdminLocationServices = {
  countries: unavailableCrud,
  cities: unavailableCrud,
  areas: unavailableCrud,
};

export const unavailableAdminContent: AdminContentServices = {
  pages: unavailableCrud,
  faqs: unavailableCrud,
  contactInfo: unavailableCrud,
  appVersions: unavailableCrud,
  maintenance: unavailableCrud,
};

export const unavailableBannersService: BannersService = { live: unavailable };
export const unavailableAdminBanners: AdminCrudService<BannerRaw> = unavailableCrud;

export const unavailableCatalogService: CatalogService = { list: unavailable };
export const unavailableAdminCatalog: AdminCrudService<CatalogServiceRaw> = unavailableCrud;

export const unavailableSalonApplication: SalonApplicationService = {
  apply: unavailable,
  status: unavailable,
  resubmit: unavailable,
};

export const unavailableSalonReview: SalonReviewService = {
  list: unavailable,
  detail: unavailable,
  approve: unavailable,
  reject: unavailable,
};

export const unavailableSalonState: SalonStateService = {
  recompute: unavailable,
  evaluate: unavailable,
  setOffline: unavailable,
  setOnline: unavailable,
};

export const unavailableSalonProfile: SalonProfileService = {
  get: unavailable,
  update: unavailable,
};

export const unavailableUploads: UploadsService = { presign: unavailable, confirm: unavailable };

export const unavailableBranches: BranchesService = {
  list: unavailable,
  get: unavailable,
  create: unavailable,
  update: unavailable,
  setMain: unavailable,
  setOffline: unavailable,
  setOnline: unavailable,
  close: unavailable,
};

export const unavailableGallery: GalleryService = {
  list: unavailable,
  add: unavailable,
  remove: unavailable,
  reorder: unavailable,
};

export const unavailableHours: HoursService = {
  get: unavailable,
  setWeekly: unavailable,
  addClosure: unavailable,
  updateClosure: unavailable,
  removeClosure: unavailable,
  previewWeekly: unavailable,
  previewClosure: unavailable,
};

export const unavailableSalonServices: SalonServicesService = {
  list: unavailable,
  add: unavailable,
  update: unavailable,
};

export const unavailableCatalogRequests: CatalogRequestsService = {
  create: unavailable,
  listForSalon: unavailable,
  listForAdmin: unavailable,
  approve: unavailable,
  reject: unavailable,
};

export const unavailableTeam: TeamService = {
  list: unavailable,
  get: unavailable,
  create: unavailable,
  update: unavailable,
  deactivate: unavailable,
  reactivate: unavailable,
};

export const unavailableStaff: StaffService = {
  get: unavailable,
  set: unavailable,
  preview: unavailable,
};

export const unavailableLeaves: LeavesService = {
  list: unavailable,
  preview: unavailable,
  add: unavailable,
  update: unavailable,
  remove: unavailable,
};

export const unavailablePolicy: PolicyService = { get: unavailable, set: unavailable };

export const unavailableAdminSalons: AdminSalonsService = {
  members: unavailable,
  list: unavailable,
  detail: unavailable,
  changeGender: unavailable,
};

export const unavailableSalonDetails: SalonDetailsService = {
  get: unavailable,
  staff: unavailable,
};

export const unavailableFavorites: FavoritesService = {
  add: unavailable,
  remove: unavailable,
  list: unavailable,
};

export const unavailableInbox: InboxService = {
  list: unavailable,
  unreadCount: unavailable,
  markRead: unavailable,
};

export const unavailableAdminCustomers: AdminCustomersService = {
  list: unavailable,
  detail: unavailable,
  block: unavailable,
  unblock: unavailable,
  delete: unavailable,
  restore: unavailable,
};

export const unavailableAdminSettings: AdminSettingsService = {
  list: unavailable,
  update: unavailable,
  auditLogs: unavailable,
  auditLog: unavailable,
};

export const unavailableAdminSearch: AdminSearchService = { search: unavailable };

export const unavailableBookingAdminExtras: BookingAdminExtrasService = {
  eligibleStaff: unavailable,
  reassign: unavailable,
  cancel: unavailable,
  refund: unavailable,
};

export const unavailableAdminCustomerExtras: AdminCustomerExtrasService = {
  update: unavailable,
  reviews: unavailable,
  notifications: unavailable,
  push: unavailable,
  forceDelete: unavailable,
};

export const unavailableAdminSalonInsights = {
  insights: {
    kpis: unavailable,
    analytics: unavailable,
    activity: unavailable,
  } satisfies SalonInsightsService,
  deletion: { decide: unavailable, request: unavailable } satisfies SalonDeletionService,
};

export const unavailableAdminSalonEdit: AdminSalonEditService = {
  profile: unavailable,
  updateProfile: unavailable,
  gallery: unavailable,
  addGalleryItem: unavailable,
  removeGalleryItem: unavailable,
  reorderGallery: unavailable,
  hours: unavailable,
  previewWeekly: unavailable,
  previewClosure: unavailable,
  setWeekly: unavailable,
  addClosure: unavailable,
  updateClosure: unavailable,
  removeClosure: unavailable,
  services: unavailable,
  addService: unavailable,
  updateService: unavailable,
  staff: unavailable,
  setStaff: unavailable,
  moveStaff: unavailable,
  policy: unavailable,
  setPolicy: unavailable,
};

export const unavailableAdminProfile: AdminProfileService = {
  get: unavailable,
  updateAlertEmails: unavailable,
  changePassword: unavailable,
  requestEmailChange: unavailable,
  confirmEmailChange: unavailable,
};

export const unavailableCampaigns: CampaignsService = {
  create: unavailable,
  list: unavailable,
  get: unavailable,
  cancel: unavailable,
  audienceSize: unavailable,
  send: unavailable,
  reconcile: unavailable,
};

export const unavailableAdminPlacements: PlacementsService = {
  salonIds: unavailable,
  list: unavailable,
  create: unavailable,
  update: unavailable,
  end: unavailable,
  reorder: unavailable,
};

export const unavailableAdminReviews: AdminReviewsService = {
  list: unavailable,
  decide: unavailable,
  remove: unavailable,
  bulk: unavailable,
};

export const unavailableReviews: ReviewsService = {
  submit: unavailable,
  list: unavailable,
  latest: unavailable,
};

export const unavailableCustomerProfile: CustomerProfileService = {
  get: unavailable,
  update: unavailable,
  setAvatar: unavailable,
  removeAvatar: unavailable,
  deleteAccount: unavailable,
};

export const unavailableBookingDrafts: BookingDraftService = {
  create: unavailable,
  get: unavailable,
  verifyOtp: unavailable,
  discard: unavailable,
};

export const unavailableBookingActions: BookingActionsService = {
  approve: unavailable,
  reject: unavailable,
  complete: unavailable,
  noShow: unavailable,
  cancel: unavailable,
  autoCancel: unavailable,
};

export const unavailableBookingCancel: BookingCancelService = { cancel: unavailable };

export const unavailableBookingReassign: BookingReassignService = {
  reassign: unavailable,
  reassignAny: unavailable,
  eligibleStaff: unavailable,
};

export const unavailableBookingQueries: BookingQueriesService = {
  list: unavailable,
  detail: unavailable,
  calendar: unavailable,
};

export const unavailableBookingAdmin: BookingAdminService = {
  changeStatus: unavailable,
  cancel: unavailable,
};

export const unavailableBookingBulk: BookingBulkService = { cancelAffected: unavailable };

export const unavailableAdminRefunds: RefundService = {
  requestForBooking: unavailable,
  refundBookingAmount: unavailable,
  refundPayment: unavailable,
  attempt: unavailable,
  runDue: unavailable,
  delayed: unavailable,
  list: unavailable,
  get: unavailable,
  retry: unavailable,
  markManual: unavailable,
};

export const unavailableAdminExports: ExportsService = {
  request: unavailable,
  list: unavailable,
  get: unavailable,
  run: unavailable,
  reconcile: unavailable,
};

export const unavailableAdminReports: ReportsService = {
  daily: unavailable,
  weekly: unavailable,
  monthly: unavailable,
  aggregateYesterday: unavailable,
};

export const unavailableAdminAlerts: AlertInbox = {
  list: unavailable,
  newCount: unavailable,
  acknowledge: unavailable,
  deliverEmails: unavailable,
};

export const unavailableAdminAnalytics: AnalyticsService = {
  events: unavailable,
  overview: unavailable,
};

export const unavailableAdminTransactions: AdminTransactionsService = {
  list: unavailable,
  get: unavailable,
  reconciliation: unavailable,
};

export const unavailableAdminPayouts: PayoutsService = {
  preview: unavailable,
  create: unavailable,
  markTransferred: unavailable,
  list: unavailable,
  get: unavailable,
  balances: unavailable,
  balanceOf: unavailable,
};

export const unavailableAdminSubscriptions: SubscriptionsService = {
  recordPayment: unavailable,
  get: unavailable,
  list: unavailable,
  expireDue: unavailable,
  endingSoon: unavailable,
};

export const unavailablePayoutDetails: PayoutDetailsService = {
  getForOwner: unavailable,
  setByOwner: unavailable,
  revealForAdmin: unavailable,
  setByAdmin: unavailable,
};

export const unavailableMerchantFinance: MerchantFinanceService = {
  balance: unavailable,
  transactions: unavailable,
  refunds: unavailable,
  payouts: unavailable,
  subscription: unavailable,
};

export const unavailablePayments: PaymentsService = {
  start: unavailable,
  verify: unavailable,
  handleWebhook: unavailable,
  reconcilePending: unavailable,
  refundOrphans: unavailable,
};

export const unavailableBookings: BookingCreationService = { create: unavailable };

export const unavailableAvailability: AvailabilityService = {
  slots: unavailable,
  plan: unavailable,
};

export const unavailableHome: HomeService = { get: unavailable };

export const unavailableSearch: SearchService = {
  search: unavailable,
  cards: unavailable,
  priceBounds: unavailable,
  nearestBranches: unavailable,
};

export const unavailableAdminBranches: AdminBranchesService = {
  list: unavailable,
  get: unavailable,
  create: unavailable,
  update: unavailable,
  setMain: unavailable,
  setOffline: unavailable,
  setOnline: unavailable,
  close: unavailable,
};

export const unavailableMerchantReviews: MerchantReviewsService = { list: unavailable };

export const unavailableMerchantStatistics: MerchantStatisticsService = { get: unavailable };

export const unavailableMerchantDashboard: MerchantDashboardService = { get: unavailable };

export const unavailableMemberSelf: MemberSelfService = {
  get: unavailable,
  update: unavailable,
  changePhone: unavailable,
  leave: unavailable,
};
