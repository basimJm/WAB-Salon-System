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
