import type { RequestHandler, Router } from 'express';
import { OTP_ROUTE_RATE_LIMIT } from '../../../constants/otp';
import { ROUTE_LIMIT_FAMILIES, type RouteLimitNamespace } from '../../../constants/security';
import { unavailableOtpGate, type ApiServices } from '../../services';
import { createRouteLimiter } from '../rateLimits';
import { createOtpRouter } from './otp.routes';
import { customerOtpRequestSchema, merchantOtpRequestSchema } from './otp.validation';

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
  requestSchema: typeof customerOtpRequestSchema,
): Router =>
  createOtpRouter({
    gate: services.otpGate ?? unavailableOtpGate,
    requestSchema,
    limiter: createOtpRouteLimiter(services, namespace),
  });

export const createCustomerOtpRouter = (services: ApiServices): Router =>
  build(services, 'customer', customerOtpRequestSchema);
export const createMerchantOtpRouter = (services: ApiServices): Router =>
  build(services, 'merchant', merchantOtpRequestSchema as never);
