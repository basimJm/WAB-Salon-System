import { Router } from 'express';
import { OTP_ROUTES } from '../../constants/otp';
import { mount } from '../../routes/mount';
import { createMerchantOtpRouter } from '../shared/otp';
import type { ApiServices } from '../services';

/** Router for the /merchant/v1 namespace. Feature routers are mounted here as they are built. */
export const createMerchantRouter = (services: ApiServices = {}): Router => {
  const router = Router();
  mount(router, OTP_ROUTES.base, createMerchantOtpRouter(services));
  return router;
};
