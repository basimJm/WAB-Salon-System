import type { RequestHandler, Router } from 'express';
import { OTP_ROUTE_RATE_LIMIT } from '../../../constants/otp';
import { ROUTE_LIMIT_FAMILIES, type RouteLimitNamespace } from '../../../constants/security';
import { unavailablePhoneOtp, type ApiServices } from '../../services';
import { createRouteLimiter } from '../rateLimits';
import { createOtpRouter } from './otp.routes';
import { CUSTOMER_OTP_SCHEMAS, MERCHANT_OTP_SCHEMAS, type OtpSchemas } from './otp.validation';

/**
 * Per-IP guard shared by the OTP and authentication routes of one namespace (routes that take a phone
 * proof). Browsing routes use the `browse` family instead (SRV-151).
 */
export const createOtpRouteLimiter = (
  services: ApiServices,
  namespace: RouteLimitNamespace,
): RequestHandler =>
  createRouteLimiter(services, namespace, ROUTE_LIMIT_FAMILIES.otp, OTP_ROUTE_RATE_LIMIT);

const build = (
  services: ApiServices,
  namespace: RouteLimitNamespace,
  schemas: OtpSchemas,
): Router =>
  createOtpRouter({
    service: services.phoneOtp ?? unavailablePhoneOtp,
    schemas,
    limiter: createOtpRouteLimiter(services, namespace),
  });

export const createCustomerOtpRouter = (services: ApiServices): Router =>
  build(services, 'customer', CUSTOMER_OTP_SCHEMAS);
export const createMerchantOtpRouter = (services: ApiServices): Router =>
  build(services, 'merchant', MERCHANT_OTP_SCHEMAS);
