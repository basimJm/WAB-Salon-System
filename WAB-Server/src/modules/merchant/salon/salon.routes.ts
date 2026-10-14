import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_SALON_ROUTES } from '../../../constants/salon';
import type {
  ApplicationStatus,
  SalonApplicationService,
} from '../../../domain/salons/salonApplication.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import { applySchema, resubmitSchema } from './salon.validation';

const statusData = (s: ApplicationStatus): Record<string, unknown> => ({
  salonId: s.salonId,
  state: s.state,
  submittedAt: s.submittedAt.toISOString(),
  resubmissionCount: s.resubmissionCount,
  rejectionReason: s.rejectionReason ?? null,
});

const bodyOf = <S extends z.ZodType>(req: Request): z.infer<S> =>
  (req.validated as { body: z.infer<S> }).body;

export interface MerchantSalonRouterOptions {
  readonly service: SalonApplicationService;
  /** Per-IP guard for the public apply route (fails closed). */
  readonly limiter: RequestHandler;
  /** `requireAuth('merchant', secret)`. */
  readonly guard: RequestHandler;
}

export const createMerchantSalonRouter = ({
  service,
  limiter,
  guard,
}: MerchantSalonRouterOptions): Router => {
  const router = Router();
  const routes = MERCHANT_SALON_ROUTES;
  router.post(
    routes.apply,
    limiter,
    validate({ body: applySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { installation, ...rest } = bodyOf<typeof applySchema>(req);
      const session = await service.apply({
        ...rest,
        device: installation,
        language: req.language,
      });
      sendCreated(req, res, {
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt.toISOString(),
        refreshToken: session.refreshToken,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt.toISOString(),
        member: session.member,
        application: statusData(session.application),
      });
    }),
  );
  router.get(
    routes.application,
    guard,
    asyncHandler(async (req: Request, res: Response) => {
      const status = await service.status({ memberId: req.auth?.subjectId ?? '' });
      sendSuccess(req, res, { data: statusData(status) });
    }),
  );
  router.post(
    routes.resubmit,
    guard,
    validate({ body: resubmitSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const status = await service.resubmit({
        memberId: req.auth?.subjectId ?? '',
        ...bodyOf<typeof resubmitSchema>(req),
      });
      sendSuccess(req, res, { data: statusData(status) });
    }),
  );
  return router;
};
