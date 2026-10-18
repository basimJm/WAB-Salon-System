import { Router, type RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { OTP_ROUTES } from '../../../constants/otp';
import type { OtpGate } from '../../../domain/otp/otpGate.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { createOtpController } from './otp.controller';
import { wrongAttemptSchema } from './otp.validation';

export interface OtpRouterOptions {
  readonly gate: OtpGate;
  /** Customer and merchant accept different purposes. */
  readonly requestSchema: ZodType;
  /** Per-IP guard (fails closed: a Redis outage answers 503, not "allowed"). */
  readonly limiter: RequestHandler;
}

/** Public routes (no token yet): the OTP pre-check and the wrong-code report. */
export const createOtpRouter = ({ gate, requestSchema, limiter }: OtpRouterOptions): Router => {
  const router = Router();
  const controller = createOtpController(gate);
  router.post(
    OTP_ROUTES.request,
    limiter,
    validate({ body: requestSchema }),
    asyncHandler(controller.request),
  );
  router.post(
    OTP_ROUTES.wrongAttempt,
    limiter,
    validate({ body: wrongAttemptSchema }),
    asyncHandler(controller.wrongAttempt),
  );
  return router;
};
