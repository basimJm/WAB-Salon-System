import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type {
  MerchantStatistics,
  MerchantStatisticsService,
} from '../../../domain/statistics/merchantStatistics.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { formatJod } from '../../../utils/money';
import { sendSuccess } from '../../../utils/response/successResponse';
import { statisticsQuery } from './statistics.validation';

/** Money leaves the server as JOD strings (integer fils inside). */
const present = (s: MerchantStatistics): Record<string, unknown> => ({
  ...s,
  bookings: {
    ...s.bookings,
    revenue: {
      online: formatJod(s.bookings.revenue.online),
      atSalon: formatJod(s.bookings.revenue.atSalon),
      total: formatJod(s.bookings.revenue.total),
    },
  },
  days: s.days.map((d) => ({ ...d, revenue: formatJod(d.revenue) })),
});

/** Statistics (M21, `STATISTICS_VIEW`) of the caller's salon or branch. */
export const createMerchantStatisticsRouter = (
  service: MerchantStatisticsService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  router.get(
    '/',
    ...guard,
    requirePermission(['STATISTICS_VIEW']),
    validate({ query: statisticsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { from, to, branchId } = (req.validated as { query: z.infer<typeof statisticsQuery> })
        .query;
      const data = await service.get({
        salonId: req.member?.salonId ?? '',
        member: { branchId: req.member?.branchId },
        from,
        to,
        branchId,
        language: req.language,
      });
      sendSuccess(req, res, { data: present(data) });
    }),
  );
  return router;
};
