import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type {
  BookingCreationService,
  BookingSummary,
} from '../../../domain/bookings/bookingCreation.service';
import {
  bookingIdParams as detailParams,
  customerBookingsQuery,
} from '../../shared/bookings/bookingQuery.schemas';
import { unavailableBookingCancel, unavailableBookingQueries } from '../../services';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { CUSTOMER_BOOKING_ROUTES } from '../../../constants/bookings';
import type { BookingQueriesService } from '../../../domain/bookings/bookingQueries.service';
import type { BookingCancelService } from '../../../domain/bookings/bookingCancel.service';
import { bookingIdParams, cancelBookingBody, createBookingBody } from './bookings.validation';

export interface BookingsRouterOptions {
  readonly service: BookingCreationService;
  /** `requireAuth('customer', secret)`. */
  readonly guard: RequestHandler;
  readonly limiter: RequestHandler;
  readonly cancel?: BookingCancelService;
  readonly queries?: BookingQueriesService;
}

export const presentSummary = (b: BookingSummary): Record<string, unknown> => ({
  ...b,
  appointmentStart: b.appointmentStart.toISOString(),
  appointmentEnd: b.appointmentEnd.toISOString(),
  respondBy: b.respondBy.toISOString(),
});

/** Booking creation from a confirmed draft (S16 step 6, S17). */
export const createBookingsRouter = ({
  service,
  guard,
  limiter,
  cancel,
  queries,
}: BookingsRouterOptions): Router => {
  const router = Router();
  router.post(
    '/',
    limiter,
    guard,
    validate({ body: createBookingBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { draftId } = (req.validated as { body: z.infer<typeof createBookingBody> }).body;
      const booking = await service.create({ customerId: req.auth?.subjectId ?? '', draftId });
      sendCreated(req, res, presentSummary(booking));
    }),
  );
  const reads = queries ?? unavailableBookingQueries;
  const audience = (req: Request): { kind: 'CUSTOMER'; customerId: string } => ({
    kind: 'CUSTOMER',
    customerId: req.auth?.subjectId ?? '',
  });
  router.get(
    '/',
    limiter,
    guard,
    validate({ query: customerBookingsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, ...query } = (
        req.validated as { query: z.infer<typeof customerBookingsQuery> }
      ).query;
      const result = await reads.list({
        audience: audience(req),
        query,
        params: { page, pageSize },
        language: req.language,
      });
      sendPaginated(req, res, result.items, { page, pageSize }, result.total);
    }),
  );
  router.get(
    '/:id',
    limiter,
    guard,
    validate({ params: detailParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: { id: string } }).params;
      sendSuccess(req, res, {
        data: await reads.detail({
          audience: audience(req),
          bookingId: id,
          language: req.language,
        }),
      });
    }),
  );
  router.post(
    CUSTOMER_BOOKING_ROUTES.cancel,
    limiter,
    guard,
    validate({ params: bookingIdParams, body: cancelBookingBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: z.infer<typeof bookingIdParams> }).params;
      const { reasonText } = (req.validated as { body: z.infer<typeof cancelBookingBody> }).body;
      const result = await (cancel ?? unavailableBookingCancel).cancel({
        customerId: req.auth?.subjectId ?? '',
        bookingId: id,
        reasonText,
      });
      sendSuccess(req, res, { data: presentSummary(result) });
    }),
  );
  return router;
};
