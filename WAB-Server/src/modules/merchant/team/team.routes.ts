import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_TEAM_ROUTES } from '../../../constants/team';
import type { TeamService } from '../../../domain/team/team.service';
import { requireOwner, requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { createMemberSchema, memberParams, teamQuery, updateMemberSchema } from './team.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/**
 * Team of the caller's salon. Reading needs `STAFF_MANAGE` (the owner always has it); adding,
 * changing roles and permissions, and (de)activating are OWNER-only (`TEAM_MANAGE`).
 */
export const createMerchantTeamRouter = (
  service: TeamService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const routes = MERCHANT_TEAM_ROUTES;
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  router.use(...guard);
  router.get(
    '/',
    requirePermission(['STAFF_MANAGE']),
    validate({ query: teamQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize } = part<typeof teamQuery>(req, 'query');
      const result = await service.list({ salonId: salonOf(req), params: { page, pageSize } });
      sendPaginated(req, res, result.items, { page, pageSize }, result.meta.total);
    }),
  );
  router.get(
    routes.byId,
    requirePermission(['STAFF_MANAGE']),
    validate({ params: memberParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof memberParams>(req, 'params');
      sendSuccess(req, res, { data: await service.get({ salonId: salonOf(req), id }) });
    }),
  );
  router.post(
    '/',
    requireOwner,
    validate({ body: createMemberSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const input = part<typeof createMemberSchema>(req, 'body');
      sendCreated(req, res, await service.create({ salonId: salonOf(req), ...input }));
    }),
  );
  router.patch(
    routes.byId,
    requireOwner,
    validate({ params: memberParams, body: updateMemberSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof memberParams>(req, 'params');
      const patch = part<typeof updateMemberSchema>(req, 'body');
      sendSuccess(req, res, { data: await service.update({ salonId: salonOf(req), id, patch }) });
    }),
  );
  for (const action of ['deactivate', 'reactivate'] as const) {
    router.post(
      routes[action],
      requireOwner,
      validate({ params: memberParams }),
      asyncHandler(async (req: Request, res: Response) => {
        const { id } = part<typeof memberParams>(req, 'params');
        sendSuccess(req, res, { data: await service[action]({ salonId: salonOf(req), id }) });
      }),
    );
  }
  return router;
};
