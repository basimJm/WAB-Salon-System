import type { Router } from 'express';
import { OTP_ROUTE_RATE_LIMIT } from '../../../constants/otp';
import { createRateLimiter } from '../../../middlewares/rateLimit';
import { unavailableOtpGate, type ApiServices } from '../../services';
import { createOtpRouter } from './otp.routes';
import { customerOtpRequestSchema, merchantOtpRequestSchema } from './otp.validation';

const build = (services: ApiServices, requestSchema: typeof customerOtpRequestSchema): Router =>
  createOtpRouter({
    gate: services.otpGate ?? unavailableOtpGate,
    requestSchema,
    limiter: createRateLimiter({
      ...OTP_ROUTE_RATE_LIMIT,
      ...(services.rateLimitStore === undefined ? {} : { store: services.rateLimitStore }),
    }),
  });

export const createCustomerOtpRouter = (services: ApiServices): Router =>
  build(services, customerOtpRequestSchema);
export const createMerchantOtpRouter = (services: ApiServices): Router =>
  build(services, merchantOtpRequestSchema as never);
