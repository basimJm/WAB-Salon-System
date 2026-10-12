import { Router } from 'express';
import { OTP_ROUTES } from '../../constants/otp';
import { mount } from '../../routes/mount';
import { createCustomerOtpRouter } from '../shared/otp';
import type { ApiServices } from '../services';

/** Router for the /customer/v1 namespace. Feature routers are mounted here as they are built. */
export const createCustomerRouter = (services: ApiServices = {}): Router => {
  const router = Router();
  mount(router, OTP_ROUTES.base, createCustomerOtpRouter(services));
  return router;
};
