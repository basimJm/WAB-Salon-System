import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_BOOKING_EXTRA_ROUTES } from '../../../constants/bookings';
import type { BookingAdminExtrasService } from '../../../domain/bookings/bookingAdminExtras.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { formatJod } from '../../../utils/money';
import { sendSuccess } from '../../../utils/response/successResponse';
import { presentSummary } from '../../customer/bookings/bookings.routes';
import { toActor } from '../crud/actor';
import {
  bookingParams,
  cancelBody,
  eligibleQuery,
  reassignBody,
  refundBody,
} from './bookingExtras.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Admin booking extras (A15): eligible staff, reassign, cancel by mode, refund a chosen amount. */
export const createAdminBookingExtrasRouter = (
  service: BookingAdminExtrasService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  const routes = ADMIN_BOOKING_EXTRA_ROUTES;
  router.use(guard);
  router.get(
    routes.eligibleStaff,
    validate({ params: bookingParams, query: eligibleQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof bookingParams>(req, 'params');
      const { personIndex } = part<typeof eligibleQuery>(req, 'query');
      sendSuccess(req, res, { data: await service.eligibleStaff({ bookingId: id, personIndex }) });
    }),
  );
  router.post(
    routes.reassign,
    validate({ params: bookingParams, body: reassignBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof bookingParams>(req, 'params');
      const body = part<typeof reassignBody>(req, 'body');
      const booking = await service.reassign({ ...body, bookingId: id, actor: toActor(req) });
      sendSuccess(req, res, { data: presentSummary(booking) });
    }),
  );
  router.post(
    routes.cancel,
    validate({ params: bookingParams, body: cancelBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof bookingParams>(req, 'params');
      const body = part<typeof cancelBody>(req, 'body');
      const result = await service.cancel({ ...body, bookingId: id, actor: toActor(req) });
      sendSuccess(req, res, { data: { ...presentSummary(result), irregular: result.irregular } });
    }),
  );
  router.post(
    routes.refund,
    validate({ params: bookingParams, body: refundBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof bookingParams>(req, 'params');
      const body = part<typeof refundBody>(req, 'body');
      const refund = await service.refund({ ...body, bookingId: id, actor: toActor(req) });
      sendSuccess(req, res, {
        data: { id: refund.id, amount: formatJod(refund.amount), status: refund.status },
      });
    }),
  );
  return router;
};
