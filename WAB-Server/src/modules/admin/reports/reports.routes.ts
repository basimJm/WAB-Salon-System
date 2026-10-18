import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_REPORT_ROUTES } from '../../../constants/reports';
import type { DailyFacts, TopSalon } from '../../../domain/reports/reportSource';
import type { ReportsService } from '../../../domain/reports/reports.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { formatJod } from '../../../utils/money';
import { sendSuccess } from '../../../utils/response/successResponse';
import { dailyQuery, monthlyQuery, weeklyQuery } from './reports.validation';

export const presentFacts = (f: DailyFacts): Record<string, unknown> => ({
  bookings: f.bookings,
  payments: {
    ...f.payments,
    collected: formatJod(f.payments.collected),
    gatewayFees: formatJod(f.payments.gatewayFees),
  },
  refunds: { ...f.refunds, amount: formatJod(f.refunds.amount) },
  registrations: f.registrations,
  reviews: f.reviews,
});
const presentTop = (list: readonly TopSalon[]): TopSalon[] => [...list];

/** Daily, weekly and monthly reports (Admin PRD A26). */
export const createAdminReportsRouter = (
  service: ReportsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    ADMIN_REPORT_ROUTES.daily,
    validate({ query: dailyQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { date } = (req.validated as { query: z.infer<typeof dailyQuery> }).query;
      const r = await service.daily(date);
      sendSuccess(req, res, {
        data: { date: r.date, ...presentFacts(r.facts), snapshot: r.snapshot },
      });
    }),
  );
  router.get(
    ADMIN_REPORT_ROUTES.weekly,
    validate({ query: weeklyQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { from } = (req.validated as { query: z.infer<typeof weeklyQuery> }).query;
      const r = await service.weekly(from);
      sendSuccess(req, res, {
        data: {
          from: r.from,
          to: r.to,
          ...presentFacts(r.facts),
          topSalons: presentTop(r.topSalons),
        },
      });
    }),
  );
  router.get(
    ADMIN_REPORT_ROUTES.monthly,
    validate({ query: monthlyQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { month } = (req.validated as { query: z.infer<typeof monthlyQuery> }).query;
      const r = await service.monthly(month);
      sendSuccess(req, res, {
        data: {
          month: r.month,
          from: r.from,
          to: r.to,
          ...presentFacts(r.facts),
          topSalons: presentTop(r.topSalons),
          payouts: { count: r.payouts.count, amount: formatJod(r.payouts.amount) },
          snapshot: r.snapshot,
          growth: r.growth,
        },
      });
    }),
  );
  return router;
};
