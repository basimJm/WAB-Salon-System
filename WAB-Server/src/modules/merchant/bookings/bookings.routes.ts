import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_BOOKING_ROUTES } from '../../../constants/bookings';
import type { BookingActionsService } from '../../../domain/bookings/bookingActions.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { presentSummary } from '../../customer/bookings/bookings.routes';
import { bookingParams, decisionBody } from './bookings.validation';

/** Salon-side booking decisions; each needs the permission of its transition (§5.7). */
export const createMerchantBookingsRouter = (
  service: BookingActionsService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const routes = MERCHANT_BOOKING_ROUTES;
  router.use(...guard);
  const target = (
    req: Request,
  ): {
    salonId: string;
    bookingId: string;
    member: { id: string; permissions: readonly string[] };
  } => {
    const { id } = (req.validated as { params: z.infer<typeof bookingParams> }).params;
    return {
      salonId: req.member?.salonId ?? '',
      bookingId: id,
      member: { id: req.member?.id ?? '', permissions: req.member?.permissions ?? [] },
    };
  };
  const body = (req: Request): z.infer<typeof decisionBody> =>
    (req.validated as { body: z.infer<typeof decisionBody> }).body;

  const simple = (
    path: string,
    permission: 'BOOKINGS_RESPOND' | 'BOOKINGS_OPERATE',
    run: (t: ReturnType<typeof target>) => ReturnType<BookingActionsService['approve']>,
  ): void => {
    router.post(
      path,
      requirePermission([permission]),
      validate({ params: bookingParams }),
      asyncHandler(async (req: Request, res: Response) => {
        sendSuccess(req, res, { data: presentSummary(await run(target(req))) });
      }),
    );
  };
  const withReason = (
    path: string,
    permission: 'BOOKINGS_RESPOND' | 'BOOKINGS_OPERATE',
    run: (
      t: ReturnType<typeof target> & z.infer<typeof decisionBody>,
    ) => ReturnType<BookingActionsService['approve']>,
  ): void => {
    router.post(
      path,
      requirePermission([permission]),
      validate({ params: bookingParams, body: decisionBody }),
      asyncHandler(async (req: Request, res: Response) => {
        sendSuccess(req, res, {
          data: presentSummary(await run({ ...target(req), ...body(req) })),
        });
      }),
    );
  };
  simple(routes.approve, 'BOOKINGS_RESPOND', (t) => service.approve(t));
  withReason(routes.reject, 'BOOKINGS_RESPOND', (t) => service.reject(t));
  simple(routes.complete, 'BOOKINGS_OPERATE', (t) => service.complete(t));
  simple(routes.noShow, 'BOOKINGS_OPERATE', (t) => service.noShow(t));
  withReason(routes.cancel, 'BOOKINGS_OPERATE', (t) => service.cancel(t));
  return router;
};
