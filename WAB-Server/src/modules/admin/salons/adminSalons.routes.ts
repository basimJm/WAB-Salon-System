import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_SALON_STATE_ROUTES } from '../../../constants/salon';
import type {
  AdminSalonDetail,
  AdminSalonRow,
  AdminSalonsService,
} from '../../../domain/salons/adminSalons.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import { salonParams } from './salonState.validation';
import { genderBody, salonsQuery } from './adminSalons.validation';

const iso = (date: Date | null): string | null => (date === null ? null : date.toISOString());
const rowData = (r: AdminSalonRow): Record<string, unknown> => ({
  ...r,
  deletionRequestedAt: iso(r.deletionRequestedAt),
  createdAt: r.createdAt.toISOString(),
});
const detailData = (d: AdminSalonDetail): Record<string, unknown> => ({
  ...rowData(d),
  deletionApprovedAt: iso(d.deletionApprovedAt),
  description: d.description,
  phone: d.phone,
  completeness: d.completeness,
  offline: d.offline === null ? null : { reason: d.offline.reason, at: d.offline.at.toISOString() },
  owner: d.owner,
  subscription:
    d.subscription === null
      ? null
      : {
          status: d.subscription.status,
          trialEndsAt: d.subscription.trialEndsAt.toISOString(),
          currentPeriodEnd: iso(d.subscription.currentPeriodEnd),
        },
});

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Admin salon list, overview and the gender change (offline/online live in the state router). */
export const createAdminSalonsRouter = (
  service: AdminSalonsService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_SALON_STATE_ROUTES;
  router.use(guard);
  router.get(
    routes.list,
    validate({ query: salonsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = part<typeof salonsQuery>(req, 'query');
      const result = await service.list({ filter, params: { page, pageSize } });
      sendPaginated(req, res, result.items.map(rowData), { page, pageSize }, result.meta.total);
    }),
  );
  router.get(
    routes.byId,
    validate({ params: salonParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      sendSuccess(req, res, { data: detailData(await service.detail(id)) });
    }),
  );
  router.get(
    routes.members,
    validate({ params: salonParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      sendSuccess(req, res, { data: await service.members(id) });
    }),
  );
  router.patch(
    routes.gender,
    validate({ params: salonParams, body: genderBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { gender, reason } = part<typeof genderBody>(req, 'body');
      const result = await service.changeGender({
        salonId: id,
        gender,
        reason,
        actor: toActor(req),
      });
      sendSuccess(req, res, { data: detailData(result) });
    }),
  );
  return router;
};
