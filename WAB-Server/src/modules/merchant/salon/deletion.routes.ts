import { Router, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { DELETION_REQUEST_NOTE_MAX_LENGTH } from '../../../constants/merchantAuth';
import { MERCHANT_SALON_ROUTES } from '../../../constants/salon';
import type { SalonDeletionService } from '../../../domain/salons/salonDeletion.service';
import { requireOwner } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';

/** Optional words for WAB; the admin contacts the owner before deciding. */
export const deletionRequestSchema = z.object({
  note: z.string().trim().min(1).max(DELETION_REQUEST_NOTE_MAX_LENGTH).optional(),
});

/** `POST /merchant/v1/salon/deletion-request` (owner, M25): asks WAB to delete the salon. */
export const createSalonDeletionRequestRouter = (
  service: SalonDeletionService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  router.post(
    MERCHANT_SALON_ROUTES.deletionRequest,
    ...guard,
    requireOwner,
    validate({ body: deletionRequestSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { note } = (req.validated as { body: z.infer<typeof deletionRequestSchema> }).body;
      const { requestedAt } = await service.request({
        salonId: req.member?.salonId ?? '',
        memberId: req.member?.id ?? '',
        note,
      });
      sendSuccess(req, res, { data: { requestedAt: requestedAt.toISOString() } });
    }),
  );
  return router;
};
