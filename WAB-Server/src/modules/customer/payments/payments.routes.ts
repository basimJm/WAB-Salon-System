import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { PAYMENT_ROUTES } from '../../../constants/payments';
import type { PaymentsService } from '../../../domain/payments/payments.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { paymentParams, startPaymentBody } from './payments.validation';

export interface PaymentsRouterOptions {
  readonly service: PaymentsService;
  /** `requireAuth('customer', secret)`. */
  readonly guard: RequestHandler;
  readonly limiter: RequestHandler;
}

/** Online payment of a booking draft: start a checkout, then ask the server to verify it (S16 step 5). */
export const createPaymentsRouter = ({
  service,
  guard,
  limiter,
}: PaymentsRouterOptions): Router => {
  const router = Router();
  router.use(limiter, guard);
  const customerOf = (req: Request): string => req.auth?.subjectId ?? '';
  router.post(
    '/',
    validate({ body: startPaymentBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = (req.validated as { body: z.infer<typeof startPaymentBody> }).body;
      sendSuccess(req, res, {
        data: await service.start({ customerId: customerOf(req), ...body }),
      });
    }),
  );
  router.post(
    PAYMENT_ROUTES.verify,
    validate({ params: paymentParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: { id: string } }).params;
      sendSuccess(req, res, {
        data: await service.verify({ customerId: customerOf(req), transactionId: id }),
      });
    }),
  );
  return router;
};
