import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_PAYOUT_ROUTES } from '../../../constants/payouts';
import type {
  PayoutPreview,
  PayoutsService,
  SalonBalance,
} from '../../../domain/payouts/payouts.service';
import type { PayoutRaw } from '../../../models/payout.model';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import type { Entity } from '../../../utils/database/plain';
import { formatJod } from '../../../utils/money';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  balancesQuery,
  createPayoutBody,
  payoutParams,
  payoutsQuery,
  previewQuery,
  transferBody,
} from './payouts.validation';

const amounts = (p: PayoutPreview | Entity<PayoutRaw>): Record<string, unknown> => ({
  periodFrom: p.periodFrom.toISOString(),
  periodTo: p.periodTo.toISOString(),
  gross: formatJod(p.gross),
  fees: formatJod(p.fees),
  refunds: formatJod(p.refunds),
  adjustments: formatJod(p.adjustments),
  net: formatJod(p.net),
});
const presentPayout = (p: Entity<PayoutRaw>): Record<string, unknown> => ({
  id: p.id,
  salonId: p.salonId,
  ...amounts(p),
  status: p.status,
  transferredAt: p.transferredAt?.toISOString() ?? null,
  transferReference: p.transferReference ?? null,
  note: p.note ?? null,
  createdBy: p.createdBy,
  createdAt: p.createdAt.toISOString(),
});
const presentBalance = (b: SalonBalance): Record<string, unknown> => ({
  salonId: b.salonId,
  name: b.name,
  balance: formatJod(b.totals.balance),
  charges: formatJod(b.totals.charges),
  gatewayFees: formatJod(b.totals.gatewayFees),
  refunds: formatJod(b.totals.refunds),
  payouts: formatJod(b.totals.payouts),
  adjustments: formatJod(b.totals.adjustments),
  dueNow: formatJod(b.dueNow),
  lastPayout:
    b.lastPayout === null
      ? null
      : {
          periodTo: b.lastPayout.periodTo.toISOString(),
          net: formatJod(b.lastPayout.net),
          status: b.lastPayout.status,
        },
});

/** Manual payouts (Admin PRD A18): balances, preview, create, record the transfer, history. */
export const createAdminPayoutsRouter = (
  service: PayoutsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_PAYOUT_ROUTES;
  const idOf = (req: Request): string => (req.validated as { params: { id: string } }).params.id;
  router.use(guard);
  router.get(
    routes.balances,
    validate({ query: balancesQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize } = (req.validated as { query: z.infer<typeof balancesQuery> }).query;
      const result = await service.balances({ page, pageSize });
      sendPaginated(req, res, result.items.map(presentBalance), { page, pageSize }, result.total);
    }),
  );
  router.get(
    routes.preview,
    validate({ query: previewQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const query = (req.validated as { query: z.infer<typeof previewQuery> }).query;
      const p = await service.preview(query);
      sendSuccess(req, res, { data: { salonId: p.salonId, ...amounts(p) } });
    }),
  );
  router.get(
    '/',
    validate({ query: payoutsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = (
        req.validated as { query: z.infer<typeof payoutsQuery> }
      ).query;
      const result = await service.list({ params: { page, pageSize }, ...filter });
      sendPaginated(req, res, result.items.map(presentPayout), { page, pageSize }, result.total);
    }),
  );
  router.post(
    '/',
    validate({ body: createPayoutBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = (req.validated as { body: z.infer<typeof createPayoutBody> }).body;
      sendCreated(req, res, presentPayout(await service.create({ ...body, actor: toActor(req) })));
    }),
  );
  router.get(
    routes.byId,
    validate({ params: payoutParams }),
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: presentPayout(await service.get(idOf(req))) });
    }),
  );
  router.post(
    routes.transfer,
    validate({ params: payoutParams, body: transferBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = (req.validated as { body: z.infer<typeof transferBody> }).body;
      sendSuccess(req, res, {
        data: presentPayout(
          await service.markTransferred({ payoutId: idOf(req), ...body, actor: toActor(req) }),
        ),
      });
    }),
  );
  return router;
};
