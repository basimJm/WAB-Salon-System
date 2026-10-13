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
import type { CatalogRequestsService } from '../domain/catalog/catalogRequests.service';
import type { SalonServicesService } from '../domain/salonServices/salonServices.service';
import type { HoursService } from '../domain/salons/hoursService';
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
  readonly otpGate?: OtpGate;
  readonly appConfig?: AppConfigService;
  readonly locations?: LocationsService;
  /** `requireAuth('admin', secret)`: every admin resource route sits behind it. */
  readonly adminGuard?: RequestHandler;
  readonly adminLocations?: AdminLocationServices;
  readonly adminContent?: AdminContentServices;
  readonly banners?: BannersService;
  readonly adminApplications?: SalonReviewService;
  readonly salonState?: SalonStateService;
  readonly uploads?: UploadsService;
  readonly gallery?: GalleryService;
  readonly hours?: HoursService;
  readonly salonServices?: SalonServicesService;
  readonly catalogRequests?: CatalogRequestsService;
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
  /** Shared store for per-route rate limits; without it each instance counts on its own. */
  readonly rateLimitStore?: Store;
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
