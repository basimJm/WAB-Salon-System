import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { AVAILABILITY_ROUTES } from '../../../constants/availability';
import type { AvailabilityService } from '../../../domain/availability/availability.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { availabilityBody, availabilityParams } from './availability.validation';

export interface AvailabilityRouterOptions {
  readonly service: AvailabilityService;
  /** `requireAuth('customer', secret)`: booking is for registered customers. */
  readonly guard: RequestHandler;
  readonly limiter: RequestHandler;
}

/** Slots of one person on one day with the free staff per slot (S16 steps 2-3). */
export const createAvailabilityRouter = ({
  service,
  guard,
  limiter,
}: AvailabilityRouterOptions): Router => {
  const router = Router();
  router.post(
    AVAILABILITY_ROUTES.availability,
    limiter,
    guard,
    validate({ params: availabilityParams, body: availabilityBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { params, body } = req.validated as unknown as {
        params: z.infer<typeof availabilityParams>;
        body: z.infer<typeof availabilityBody>;
      };
      const result = await service.slots({
        salonId: params.salonId,
        branchId: body.branchId,
        date: body.date,
        person: body.person,
        others: body.others,
        draftId: body.draftId,
      });
      sendSuccess(req, res, {
        data: {
          date: result.date,
          reason: result.reason,
          durationMinutes: result.durationMinutes,
          slots: result.slots.map((s) => ({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            available: s.available,
            eligibleStaffIds: s.eligibleStaffIds,
          })),
        },
      });
    }),
  );
  return router;
};
