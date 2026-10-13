import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_SALON_STATE_ROUTES } from '../../../constants/salon';
import type { SalonStateService } from '../../../domain/salons/salonState.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import { reasonBody, salonParams } from './salonState.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** `POST /admin/v1/salons/:id/offline|online`: only an admin changes OFFLINE (BUSINESS_DOMAIN.md §5.2). */
export const createAdminSalonStateRouter = (
  service: SalonStateService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  const routes = {
    offline: ADMIN_SALON_STATE_ROUTES.offline,
    online: ADMIN_SALON_STATE_ROUTES.online,
  };
  for (const kind of ['offline', 'online'] as const) {
    router.post(
      routes[kind],
      validate({ params: salonParams, body: reasonBody }),
      asyncHandler(async (req: Request, res: Response) => {
        const { id } = part<typeof salonParams>(req, 'params');
        const { reason } = part<typeof reasonBody>(req, 'body');
        const method = kind === 'offline' ? 'setOffline' : 'setOnline';
        sendSuccess(req, res, {
          data: await service[method]({ salonId: id, reason, actor: toActor(req) }),
        });
      }),
    );
  }
  return router;
};
