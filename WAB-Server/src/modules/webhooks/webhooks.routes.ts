import { Router, type Request, type Response } from 'express';
import { PAYMENT_WEBHOOK_ROUTE, PAYMENT_WEBHOOK_SIGNATURE_HEADERS } from '../../constants/payments';
import type { PaymentsService } from '../../domain/payments/payments.service';
import { asyncHandler } from '../../utils/async';
import { UnauthorizedError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response/successResponse';

/** Header values as single strings (a repeated header keeps its first value). */
const singleValued = (headers: Request['headers']): Record<string, string | undefined> =>
  Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, Array.isArray(value) ? value[0] : value]),
  );

/**
 * Gateway callbacks. They carry no client token: authenticity is the provider's signature check on
 * the raw body, and nothing is trusted until the outcome is confirmed with the gateway.
 */
export const createWebhooksRouter = (service: PaymentsService): Router => {
  const router = Router();
  router.post(
    PAYMENT_WEBHOOK_ROUTE,
    asyncHandler(async (req: Request, res: Response) => {
      const signature = PAYMENT_WEBHOOK_SIGNATURE_HEADERS.map((name) => req.header(name)).find(
        (value) => value !== undefined,
      );
      if (req.rawBody === undefined || signature === undefined) throw new UnauthorizedError();
      sendSuccess(req, res, {
        data: await service.handleWebhook({
          rawBody: req.rawBody,
          signature,
          headers: singleValued(req.headers),
        }),
      });
    }),
  );
  return router;
};
