import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_CUSTOMER_ROUTES } from '../../../constants/adminCustomers';
import type {
  AdminCustomerDetail,
  AdminCustomerRow,
  AdminCustomersService,
} from '../../../domain/customers/adminCustomers.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import { customerParams, customersQuery, reasonBody } from './customers.validation';

const iso = (date: Date | null): string | null => (date === null ? null : date.toISOString());
const row = (r: AdminCustomerRow): Record<string, unknown> => ({
  ...r,
  registeredAt: r.registeredAt.toISOString(),
  lastActiveAt: iso(r.lastActiveAt),
});
const detail = (d: AdminCustomerDetail): Record<string, unknown> => ({
  ...row(d),
  email: d.email,
  areaId: d.areaId,
  language: d.language,
  pushEnabled: d.pushEnabled,
  blockedReason: d.blockedReason,
  blockedAt: iso(d.blockedAt),
  deletionScheduledAt: iso(d.deletionScheduledAt),
  journeyUserId: d.journeyUserId,
  devices: d.devices.map((x) => ({ ...x, lastSeenAt: x.lastSeenAt.toISOString() })),
});

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Customers (A12): list, detail, block / unblock, delete (grace period), restore. */
export const createAdminCustomersRouter = (
  service: AdminCustomersService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_CUSTOMER_ROUTES;
  router.use(guard);
  router.get(
    '/',
    validate({ query: customersQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...filter } = part<typeof customersQuery>(req, 'query');
      const result = await service.list({ ...filter, params: { page, pageSize } });
      sendPaginated(req, res, result.items.map(row), { page, pageSize }, result.total);
    }),
  );
  router.get(
    routes.byId,
    validate({ params: customerParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof customerParams>(req, 'params');
      sendSuccess(req, res, { data: detail(await service.detail(id)) });
    }),
  );
  const action = (
    path: string,
    run: (input: {
      id: string;
      reason: string;
      actor: ReturnType<typeof toActor>;
    }) => Promise<unknown>,
  ): void => {
    router.post(
      path,
      validate({ params: customerParams, body: reasonBody }),
      asyncHandler(async (req: Request, res: Response) => {
        const { id } = part<typeof customerParams>(req, 'params');
        const { reason } = part<typeof reasonBody>(req, 'body');
        const result = await run({ id, reason, actor: toActor(req) });
        const data =
          typeof result === 'object' && result !== null && 'deletionScheduledAt' in result
            ? { deletionScheduledAt: (result.deletionScheduledAt as Date).toISOString() }
            : null;
        sendSuccess(req, res, { data });
      }),
    );
  };
  action(routes.block, (i) => service.block(i));
  action(routes.unblock, (i) => service.unblock(i));
  action(routes.delete, (i) => service.delete(i));
  action(routes.restore, (i) => service.restore(i));
  return router;
};
