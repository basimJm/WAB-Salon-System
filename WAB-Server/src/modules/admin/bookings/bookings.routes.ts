import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_BOOKING_ROUTES, ADMIN_BOOKING_STATUS_ROUTE } from '../../../constants/bookings';
import type { BookingAdminService } from '../../../domain/bookings/bookingAdmin.service';
import type { BookingQueriesService } from '../../../domain/bookings/bookingQueries.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import { presentSummary } from '../../customer/bookings/bookings.routes';
import { unavailableBookingAdmin } from '../../services';
import { statusChangeBody } from './bookings.validation';
import { adminBookingsQuery, bookingIdParams } from '../../shared/bookings/bookingQuery.schemas';

/** Admin bookings list and details (A15); the admin sees every salon and customer. */
export const createAdminBookingsRouter = (
  service: BookingQueriesService,
  guard: RequestHandler,
  admin?: BookingAdminService,
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    '/',
    validate({ query: adminBookingsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, status, ...query } = (
        req.validated as { query: z.infer<typeof adminBookingsQuery> }
      ).query;
      const result = await service.list({
        audience: { kind: 'ADMIN' },
        query: { ...query, statuses: status },
        params: { page, pageSize },
        language: req.language,
      });
      sendPaginated(req, res, result.items, { page, pageSize }, result.total);
    }),
  );
  router.get(
    ADMIN_BOOKING_ROUTES.byId,
    validate({ params: bookingIdParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: { id: string } }).params;
      sendSuccess(req, res, {
        data: await service.detail({
          audience: { kind: 'ADMIN' },
          bookingId: id,
          language: req.language,
        }),
      });
    }),
  );
  router.post(
    ADMIN_BOOKING_STATUS_ROUTE,
    validate({ params: bookingIdParams, body: statusChangeBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: { id: string } }).params;
      const { status, reason } = (req.validated as { body: z.infer<typeof statusChangeBody> }).body;
      const result = await (admin ?? unavailableBookingAdmin).changeStatus({
        bookingId: id,
        to: status,
        reason,
        actor: toActor(req),
      });
      sendSuccess(req, res, { data: { ...presentSummary(result), irregular: result.irregular } });
    }),
  );
  return router;
};
