import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_TRANSACTION_ROUTES } from '../../../constants/adminFinance';
import type { AdminTransactionsService } from '../../../domain/finance/adminTransactions.service';
import { validate } from '../../../middlewares/validate';
import type { TransactionRaw } from '../../../models/transaction.model';
import { asyncHandler } from '../../../utils/async';
import type { Entity } from '../../../utils/database/plain';
import { formatJod } from '../../../utils/money';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { transactionParams, transactionsQuery } from './transactions.validation';

export const presentTransaction = (t: Entity<TransactionRaw>): Record<string, unknown> => ({
  id: t.id,
  bookingDraftId: t.bookingDraftId ?? null,
  bookingId: t.bookingId ?? null,
  customerId: t.customerId,
  salonId: t.salonId,
  type: t.type,
  amount: formatJod(t.amount),
  currency: t.currency,
  attempt: t.attempt,
  provider: t.provider,
  providerRef: t.providerRef ?? null,
  status: t.status,
  gatewayCode: t.gatewayCode ?? null,
  gatewayMessage: t.gatewayMessage ?? null,
  gatewayFee: t.gatewayFee === undefined ? null : formatJod(t.gatewayFee),
  refundedAt: t.refundedAt?.toISOString() ?? null,
  chargedAt: t.chargedAt?.toISOString() ?? null,
  platform: t.platform,
  appVersion: t.appVersion,
  createdAt: t.createdAt.toISOString(),
});

/** Payment attempts with gateway codes and the reconciliation view (Admin PRD A16-A18). */
export const createAdminTransactionsRouter = (
  service: AdminTransactionsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    '/',
    validate({ query: transactionsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = (
        req.validated as { query: z.infer<typeof transactionsQuery> }
      ).query;
      const result = await service.list({ params: { page, pageSize }, filter });
      sendPaginated(
        req,
        res,
        result.items.map(presentTransaction),
        { page, pageSize },
        result.total,
      );
    }),
  );
  router.get(
    ADMIN_TRANSACTION_ROUTES.byId,
    validate({ params: transactionParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: { id: string } }).params;
      const detail = await service.get(id);
      sendSuccess(req, res, {
        data: {
          ...presentTransaction(detail.transaction),
          raw: detail.transaction.raw ?? null,
          attempts: detail.attempts.map(presentTransaction),
        },
      });
    }),
  );
  return router;
};

export const createAdminReconciliationRouter = (
  service: AdminTransactionsService,
  guard: RequestHandler,
  now: () => Date = () => new Date(),
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const r = await service.reconciliation(now());
      sendSuccess(req, res, {
        data: {
          stuckPending: r.stuckPending.map(presentTransaction),
          paidWithoutBooking: r.paidWithoutBooking.map(presentTransaction),
          missingLedger: r.missingLedger.map(presentTransaction),
        },
      });
    }),
  );
  return router;
};
