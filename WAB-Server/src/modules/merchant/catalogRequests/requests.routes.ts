import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type { CatalogRequestsService } from '../../../domain/catalog/catalogRequests.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated } from '../../../utils/response/successResponse';
import { createRequestSchema, requestsQuery } from './requests.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** The salon's catalog requests; needs `SERVICES_MANAGE`. */
export const createMerchantCatalogRequestsRouter = (
  service: CatalogRequestsService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  router.use(...guard, requirePermission(['SERVICES_MANAGE']));
  router.get(
    '/',
    validate({ query: requestsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize } = part<typeof requestsQuery>(req, 'query');
      const result = await service.listForSalon({
        salonId: req.member?.salonId ?? '',
        params: { page, pageSize },
      });
      sendPaginated(req, res, result.items, { page, pageSize }, result.meta.total);
    }),
  );
  router.post(
    '/',
    validate({ body: createRequestSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const input = part<typeof createRequestSchema>(req, 'body');
      sendCreated(
        req,
        res,
        await service.create({
          salonId: req.member?.salonId ?? '',
          memberId: req.member?.id ?? '',
          ...input,
        }),
      );
    }),
  );
  return router;
};
