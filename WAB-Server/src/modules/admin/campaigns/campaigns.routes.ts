import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_CAMPAIGN_ROUTES } from '../../../constants/campaigns';
import type { CampaignView, CampaignsService } from '../../../domain/campaigns/campaigns.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  audienceSizeBody,
  campaignParams,
  campaignsQuery,
  cancelCampaignBody,
  createCampaignBody,
} from './campaigns.validation';

const present = (c: CampaignView): Record<string, unknown> => ({
  ...c,
  scheduledAt: c.scheduledAt.toISOString(),
  sentAt: c.sentAt?.toISOString() ?? null,
  cancelledAt: c.cancelledAt?.toISOString() ?? null,
});

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'query' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Promotional push campaigns (A25): compose, schedule, cancel, history with statistics. */
export const createAdminCampaignsRouter = (
  service: CampaignsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_CAMPAIGN_ROUTES;
  router.use(guard);
  router.get(
    '/',
    validate({ query: campaignsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = part<typeof campaignsQuery>(req, 'query');
      const result = await service.list({ ...filter, params: { page, pageSize } });
      sendPaginated(req, res, result.items.map(present), { page, pageSize }, result.total);
    }),
  );
  router.post(
    '/',
    validate({ body: createCampaignBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { reason, ...data } = part<typeof createCampaignBody>(req, 'body');
      sendCreated(req, res, present(await service.create({ data, reason, actor: toActor(req) })));
    }),
  );
  router.post(
    routes.audience,
    validate({ body: audienceSizeBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = part<typeof audienceSizeBody>(req, 'body');
      sendSuccess(req, res, { data: { size: await service.audienceSize(body) } });
    }),
  );
  router.get(
    routes.byId,
    validate({ params: campaignParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof campaignParams>(req, 'params');
      sendSuccess(req, res, { data: present(await service.get(id)) });
    }),
  );
  router.post(
    routes.cancel,
    validate({ params: campaignParams, body: cancelCampaignBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof campaignParams>(req, 'params');
      const { reason } = part<typeof cancelCampaignBody>(req, 'body');
      sendSuccess(req, res, {
        data: present(await service.cancel({ id, reason, actor: toActor(req) })),
      });
    }),
  );
  return router;
};
