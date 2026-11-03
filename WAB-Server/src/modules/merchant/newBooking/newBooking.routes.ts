import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_NEW_BOOKING_ROUTES } from '../../../constants/bookings';
import type { MerchantBookingService } from '../../../domain/bookings/merchantBooking.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import { presentSummary } from '../../customer/bookings/bookings.routes';
import { customerLookupQuery, merchantBookingBody } from './newBooking.validation';

const canCreate = requirePermission(['BOOKINGS_CREATE']);

/** `POST /merchant/v1/bookings`: the business books for a customer (§5.20). */
export const createMerchantNewBookingRouter = (
  service: MerchantBookingService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  router.post(
    MERCHANT_NEW_BOOKING_ROUTES.create,
    ...guard,
    canCreate,
    validate({ body: merchantBookingBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = (req.validated as { body: z.infer<typeof merchantBookingBody> }).body;
      const created = await service.create({
        salonId: req.member?.salonId ?? '',
        member: { id: req.member?.id ?? '', branchId: req.member?.branchId },
        branchId: body.branchId,
        customer: body.customer,
        persons: body.persons,
      });
      // `sendCreated` takes the data itself (SRV-188: it was wrapped in `data` twice).
      sendCreated(req, res, {
        ...presentSummary(created),
        customerRegistered: created.customerRegistered,
      });
    }),
  );
  return router;
};

/** `GET /merchant/v1/customers/lookup`: is this number on WAB? (§5.20, rate-limited). */
export const createMerchantCustomerLookupRouter = (
  service: MerchantBookingService,
  guard: readonly RequestHandler[],
  limiter: RequestHandler,
): Router => {
  const router = Router();
  router.get(
    MERCHANT_NEW_BOOKING_ROUTES.lookup,
    limiter,
    ...guard,
    canCreate,
    validate({ query: customerLookupQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const phone = (req.validated as { query: z.infer<typeof customerLookupQuery> }).query;
      sendSuccess(req, res, { data: await service.lookup({ phone }) });
    }),
  );
  return router;
};
