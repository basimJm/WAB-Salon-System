import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { BOOKING_DRAFT_ROUTES } from '../../../constants/bookingDrafts';
import type { BookingDraftService, DraftView } from '../../../domain/bookings/bookingDraft.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import { createDraftBody, draftParams, verifyOtpBody } from './drafts.validation';

export interface DraftsRouterOptions {
  readonly service: BookingDraftService;
  /** `requireAuth('customer', secret)`. */
  readonly guard: RequestHandler;
  readonly limiter: RequestHandler;
}

const present = (d: DraftView): Record<string, unknown> => ({
  ...d,
  expiresAt: d.expiresAt.toISOString(),
  persons: d.persons.map((p) => ({
    ...p,
    start: p.start.toISOString(),
    end: p.end.toISOString(),
  })),
});

const me = (req: Request): string => req.auth?.subjectId ?? '';

/** The booking summary before confirmation (S16 steps 5-6): create, read, discard. */
export const createBookingDraftsRouter = ({
  service,
  guard,
  limiter,
}: DraftsRouterOptions): Router => {
  const router = Router();
  router.use(limiter, guard);
  router.post(
    '/',
    validate({ body: createDraftBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const body = (req.validated as { body: z.infer<typeof createDraftBody> }).body;
      const draft = await service.create({
        customerId: me(req),
        salonId: body.salonId,
        paymentMethod: body.paymentMethod,
        persons: body.persons,
        language: req.language,
      });
      sendCreated(req, res, present(draft));
    }),
  );
  router.get(
    BOOKING_DRAFT_ROUTES.byId,
    validate({ params: draftParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: z.infer<typeof draftParams> }).params;
      sendSuccess(req, res, {
        data: present(await service.get({ customerId: me(req), id, language: req.language })),
      });
    }),
  );
  router.post(
    BOOKING_DRAFT_ROUTES.verifyOtp,
    validate({ params: draftParams, body: verifyOtpBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { params, body } = req.validated as unknown as {
        params: z.infer<typeof draftParams>;
        body: z.infer<typeof verifyOtpBody>;
      };
      const { otpVerifiedAt } = await service.verifyOtp({
        customerId: me(req),
        id: params.id,
        idToken: body.idToken,
      });
      sendSuccess(req, res, { data: { otpVerifiedAt: otpVerifiedAt.toISOString() } });
    }),
  );
  router.delete(
    BOOKING_DRAFT_ROUTES.byId,
    validate({ params: draftParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: z.infer<typeof draftParams> }).params;
      await service.discard({ customerId: me(req), id });
      sendSuccess(req, res);
    }),
  );
  return router;
};
