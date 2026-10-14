import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_SERVICES_ROUTES } from '../../../constants/salonServices';
import type { SalonServicesService } from '../../../domain/salonServices/salonServices.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import {
  addServiceSchema,
  serviceParams,
  servicesQuery,
  updateServiceSchema,
} from './services.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** The salon's own services; everything needs `SERVICES_MANAGE`. Services are switched off, not deleted. */
export const createMerchantServicesRouter = (
  service: SalonServicesService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  router.use(...guard, requirePermission(['SERVICES_MANAGE']));
  router.get(
    '/',
    validate({ query: servicesQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize } = part<typeof servicesQuery>(req, 'query');
      const result = await service.list({
        salonId: salonOf(req),
        language: req.language,
        params: { page, pageSize },
      });
      sendPaginated(req, res, result.items, { page, pageSize }, result.meta.total);
    }),
  );
  router.post(
    '/',
    validate({ body: addServiceSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { catalogServiceId, ...fields } = part<typeof addServiceSchema>(req, 'body');
      sendCreated(
        req,
        res,
        await service.add({
          salonId: salonOf(req),
          language: req.language,
          catalogServiceId,
          fields,
        }),
      );
    }),
  );
  router.patch(
    MERCHANT_SERVICES_ROUTES.byId,
    validate({ params: serviceParams, body: updateServiceSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof serviceParams>(req, 'params');
      const fields = part<typeof updateServiceSchema>(req, 'body');
      sendSuccess(req, res, {
        data: await service.update({ salonId: salonOf(req), language: req.language, id, fields }),
      });
    }),
  );
  return router;
};
