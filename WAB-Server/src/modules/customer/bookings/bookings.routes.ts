import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type {
  BookingCreationService,
  BookingSummary,
} from '../../../domain/bookings/bookingCreation.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated } from '../../../utils/response/successResponse';
import { createBookingBody } from './bookings.validation';

export interface BookingsRouterOptions {
  readonly service: BookingCreationService;
  /** `requireAuth('customer', secret)`. */
  readonly guard: RequestHandler;
  readonly limiter: RequestHandler;
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
  return router;
};
