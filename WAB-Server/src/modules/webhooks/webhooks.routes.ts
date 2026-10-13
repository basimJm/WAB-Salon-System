import { Router, type Request, type Response } from 'express';
import { PAYMENT_WEBHOOK_ROUTE, PAYMENT_WEBHOOK_SIGNATURE_HEADER } from '../../constants/payments';
import type { PaymentsService } from '../../domain/payments/payments.service';
import { asyncHandler } from '../../utils/async';
import { UnauthorizedError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response/successResponse';

/**
 * Gateway callbacks. They carry no client token: authenticity is the provider's signature check on
 * the raw body, and nothing is trusted until the outcome is confirmed with the gateway.
 */
export const createWebhooksRouter = (service: PaymentsService): Router => {
  const router = Router();
  router.post(
    PAYMENT_WEBHOOK_ROUTE,
    asyncHandler(async (req: Request, res: Response) => {
      const signature = req.header(PAYMENT_WEBHOOK_SIGNATURE_HEADER);
      if (req.rawBody === undefined || signature === undefined) throw new UnauthorizedError();
      sendSuccess(req, res, {
        data: await service.handleWebhook({ rawBody: req.rawBody, signature }),
      });
    }),
  );
  return router;
};
