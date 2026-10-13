import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_FINANCE_ROUTES, MERCHANT_SUBSCRIPTION_ROUTES } from '../../../constants/finance';
import type {
  FinancePayoutRow,
  FinanceRefundRow,
  FinanceTransactionRow,
  MerchantFinanceService,
  MerchantSubscriptionView,
} from '../../../domain/finance/merchantFinance.service';
import type { SalonBalance } from '../../../domain/payouts/payouts.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { formatJod } from '../../../utils/money';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { financeListQuery } from './finance.validation';

const iso = (d: Date | null): string | null => d?.toISOString() ?? null;

const presentBalance = (b: SalonBalance): Record<string, unknown> => ({
  balance: formatJod(b.totals.balance),
  dueNow: formatJod(b.dueNow),
  collected: formatJod(b.totals.charges),
  gatewayFees: formatJod(-b.totals.gatewayFees),
  refunds: formatJod(-b.totals.refunds),
  paidOut: formatJod(-b.totals.payouts),
  lastPayout:
    b.lastPayout === null
      ? null
      : {
          net: formatJod(b.lastPayout.net),
          periodTo: iso(b.lastPayout.periodTo),
          status: b.lastPayout.status,
        },
});
const presentTransaction = (t: FinanceTransactionRow): Record<string, unknown> => ({
  id: t.id,
  bookingId: t.bookingId,
  referenceNumber: t.referenceNumber,
  type: t.type,
  amount: formatJod(t.amount),
  gatewayFee: formatJod(t.gatewayFee),
  net: formatJod(t.net),
  createdAt: iso(t.createdAt),
});
const presentRefund = (r: FinanceRefundRow): Record<string, unknown> => ({
  ...r,
  amount: formatJod(r.amount),
  createdAt: iso(r.createdAt),
  completedAt: iso(r.completedAt),
});
const presentPayout = (p: FinancePayoutRow): Record<string, unknown> => ({
  id: p.id,
  periodFrom: iso(p.periodFrom),
  periodTo: iso(p.periodTo),
  gross: formatJod(p.gross),
  fees: formatJod(p.fees),
  refunds: formatJod(p.refunds),
  adjustments: formatJod(p.adjustments),
  net: formatJod(p.net),
  status: p.status,
  transferredAt: iso(p.transferredAt),
  transferReference: p.transferReference,
});
const presentSubscription = (s: MerchantSubscriptionView): Record<string, unknown> => ({
  ...s,
  trialEndsAt: iso(s.trialEndsAt),
  currentPeriodEnd: iso(s.currentPeriodEnd),
  endsAt: iso(s.endsAt),
  lastPaymentAt: iso(s.lastPaymentAt),
});

/** Finance (`FINANCE_VIEW`, M22) and subscription status (`SUBSCRIPTION_VIEW`, M23) of the caller's salon. */
export const createMerchantFinanceRouter = (
  service: MerchantFinanceService,
  guard: readonly RequestHandler[],
): { finance: Router; subscription: Router } => {
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  const query = (req: Request): z.infer<typeof financeListQuery> =>
    (req.validated as { query: z.infer<typeof financeListQuery> }).query;
  const routes = MERCHANT_FINANCE_ROUTES;

  const finance = Router();
  finance.use(...guard, requirePermission(['FINANCE_VIEW']));
  finance.get(
    routes.balance,
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: presentBalance(await service.balance(salonOf(req))) });
    }),
  );
  const list = (
    path: string,
    load: (
      input: Parameters<MerchantFinanceService['transactions']>[0],
    ) => Promise<{ items: unknown[]; total: number }>,
    present: (row: never) => Record<string, unknown>,
  ): void => {
    finance.get(
      path,
      validate({ query: financeListQuery }),
      asyncHandler(async (req: Request, res: Response) => {
        const { page, pageSize, from, to } = query(req);
        const result = await load({
          salonId: salonOf(req),
          params: { page, pageSize },
          range: { from, to },
        });
        sendPaginated(
          req,
          res,
          result.items.map((row) => present(row as never)),
          { page, pageSize },
          result.total,
        );
      }),
    );
  };
  list(routes.transactions, (i) => service.transactions(i), presentTransaction);
  list(routes.refunds, (i) => service.refunds(i), presentRefund);
  list(routes.payouts, (i) => service.payouts(i), presentPayout);

  const subscription = Router();
  subscription.use(...guard, requirePermission(['SUBSCRIPTION_VIEW']));
  subscription.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, {
        data: presentSubscription(await service.subscription(salonOf(req))),
      });
    }),
  );
  return { finance, subscription };
};

export { MERCHANT_SUBSCRIPTION_ROUTES };
