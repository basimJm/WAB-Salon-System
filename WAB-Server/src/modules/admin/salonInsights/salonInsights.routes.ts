import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_SALON_INSIGHT_ROUTES } from '../../../constants/adminSalonInsights';
import type { SalonDeletionService } from '../../../domain/salons/salonDeletion.service';
import type { SalonInsightsService } from '../../../domain/salons/salonInsights.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  activityQuery,
  analyticsQuery,
  deletionDecisionBody,
  salonParams,
} from './salonInsights.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

export interface SalonInsightsRouterDeps {
  readonly insights: SalonInsightsService;
  readonly deletion: SalonDeletionService;
}

/** The salon page of the admin panel: KPIs, analytics, activity and the deletion decision (Admin PRD A13). */
export const createAdminSalonInsightsRouter = (
  { insights, deletion }: SalonInsightsRouterDeps,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_SALON_INSIGHT_ROUTES;
  router.use(guard);
  router.get(
    routes.kpis,
    validate({ params: salonParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      sendSuccess(req, res, { data: await insights.kpis(id) });
    }),
  );
  router.get(
    routes.analytics,
    validate({ params: salonParams, query: analyticsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { from, to } = part<typeof analyticsQuery>(req, 'query');
      sendSuccess(req, res, { data: await insights.analytics({ salonId: id, from, to }) });
    }),
  );
  router.get(
    routes.activity,
    validate({ params: salonParams, query: activityQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { page, pageSize } = part<typeof activityQuery>(req, 'query');
      const result = await insights.activity({ salonId: id, params: { page, pageSize } });
      sendPaginated(
        req,
        res,
        result.items.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
        { page, pageSize },
        result.total,
      );
    }),
  );
  router.post(
    routes.deletionDecision,
    validate({ params: salonParams, body: deletionDecisionBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { decision, reason } = part<typeof deletionDecisionBody>(req, 'body');
      sendSuccess(req, res, {
        data: await deletion.decide({ salonId: id, decision, reason, actor: toActor(req) }),
      });
    }),
  );
  return router;
};
