import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_ANALYTICS_ROUTES } from '../../../constants/analytics';
import type { AnalyticsService } from '../../../domain/analytics/analytics.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { eventsQuery, overviewQuery } from './analytics.validation';

/** Dashboard numbers from the server events (Admin PRD A01, A07-A09). */
export const createAdminAnalyticsRouter = (
  service: AnalyticsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    ADMIN_ANALYTICS_ROUTES.overview,
    validate({ query: overviewQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const query = (req.validated as { query: z.infer<typeof overviewQuery> }).query;
      sendSuccess(req, res, { data: await service.overview(query) });
    }),
  );
  router.get(
    ADMIN_ANALYTICS_ROUTES.events,
    validate({ query: eventsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const query = (req.validated as { query: z.infer<typeof eventsQuery> }).query;
      sendSuccess(req, res, { data: await service.events(query) });
    }),
  );
  return router;
};
