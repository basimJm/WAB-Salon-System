import type { RequestHandler } from 'express';
import type { Store } from 'express-rate-limit';
import type { AdminLoginService } from '../domain/auth/adminLogin.service';
import type { AdminAuthService } from '../domain/auth/adminAuth.service';
import type { MerchantAuthService } from '../domain/auth/merchantAuth.service';
import type { CustomerAuthService } from '../domain/auth/customerAuth.service';
import type { OtpGate } from '../domain/otp/otpGate.service';
import { ExternalServiceError } from '../utils/errors';

/** Long-lived services the feature routers need. `server.ts` builds them once Redis is connected. */
export interface ApiServices {
  readonly otpGate?: OtpGate;
  readonly merchantAuth?: MerchantAuthService;
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
