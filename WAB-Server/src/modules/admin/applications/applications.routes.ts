import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_APPLICATION_ROUTES } from '../../../constants/salon';
import type {
  ApplicationDetail,
  ApplicationRow,
  SalonReviewService,
} from '../../../domain/salons/salonReview.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import { applicationParams, applicationsQuery, decisionBody } from './applications.validation';

const rowData = (r: ApplicationRow): Record<string, unknown> => ({
  ...r,
  submittedAt: r.submittedAt.toISOString(),
});
const detailData = (d: ApplicationDetail): Record<string, unknown> => rowData(d);

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'query' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

export const createAdminApplicationsRouter = (
  service: SalonReviewService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_APPLICATION_ROUTES;
  router.use(guard);
  router.get(
    '/',
    validate({ query: applicationsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, state, businessType } = part<typeof applicationsQuery>(req, 'query');
      const result = await service.list({ state, businessType, params: { page, pageSize } });
      sendPaginated(req, res, result.items.map(rowData), { page, pageSize }, result.total);
    }),
  );
  router.get(
    routes.byId,
    validate({ params: applicationParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof applicationParams>(req, 'params');
      sendSuccess(req, res, { data: detailData(await service.detail(id)) });
    }),
  );
  for (const decision of ['approve', 'reject'] as const) {
    router.post(
      routes[decision],
      validate({ params: applicationParams, body: decisionBody }),
      asyncHandler(async (req: Request, res: Response) => {
        const { id } = part<typeof applicationParams>(req, 'params');
        const { reason } = part<typeof decisionBody>(req, 'body');
        const result = await service[decision]({ salonId: id, reason, actor: toActor(req) });
        sendSuccess(req, res, { data: rowData(result) });
      }),
    );
  }
  return router;
};
