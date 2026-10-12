import type { RequestHandler, Router } from 'express';
import { OTP_ROUTE_RATE_LIMIT } from '../../../constants/otp';
import { createRateLimiter } from '../../../middlewares/rateLimit';
import { unavailableOtpGate, type ApiServices } from '../../services';
import { createOtpRouter } from './otp.routes';
import { customerOtpRequestSchema, merchantOtpRequestSchema } from './otp.validation';

/** Per-IP guard shared by the OTP and authentication routes of one namespace. */
export const createOtpRouteLimiter = (services: ApiServices): RequestHandler =>
  createRateLimiter({
    ...OTP_ROUTE_RATE_LIMIT,
    ...(services.rateLimitStore === undefined ? {} : { store: services.rateLimitStore }),
  });

const build = (services: ApiServices, requestSchema: typeof customerOtpRequestSchema): Router =>
  createOtpRouter({
    gate: services.otpGate ?? unavailableOtpGate,
    requestSchema,
    limiter: createOtpRouteLimiter(services),
  });

export const createCustomerOtpRouter = (services: ApiServices): Router =>
  build(services, customerOtpRequestSchema);
export const createMerchantOtpRouter = (services: ApiServices): Router =>
  build(services, merchantOtpRequestSchema as never);
