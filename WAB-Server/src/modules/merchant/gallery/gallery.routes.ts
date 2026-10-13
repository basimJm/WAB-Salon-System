import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { MERCHANT_GALLERY_ROUTES } from '../../../constants/gallery';
import type { GalleryService } from '../../../domain/gallery/gallery.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import { addGallerySchema, galleryParams, reorderSchema } from './gallery.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Gallery management of the caller's own salon; everything needs `GALLERY_MANAGE`. */
export const createMerchantGalleryRouter = (
  service: GalleryService,
  guard: readonly RequestHandler[],
): Router => {
  const router = Router();
  const routes = MERCHANT_GALLERY_ROUTES;
  const salonOf = (req: Request): string => req.member?.salonId ?? '';
  router.use(...guard, requirePermission(['GALLERY_MANAGE']));
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(req, res, { data: await service.list(salonOf(req)) });
    }),
  );
  router.post(
    '/',
    validate({ body: addGallerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const input = part<typeof addGallerySchema>(req, 'body');
      sendCreated(req, res, await service.add({ salonId: salonOf(req), ...input }));
    }),
  );
  router.put(
    routes.order,
    validate({ body: reorderSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { ids } = part<typeof reorderSchema>(req, 'body');
      sendSuccess(req, res, { data: await service.reorder({ salonId: salonOf(req), ids }) });
    }),
  );
  router.delete(
    routes.byId,
    validate({ params: galleryParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof galleryParams>(req, 'params');
      await service.remove({ salonId: salonOf(req), id });
      sendSuccess(req, res);
    }),
  );
  return router;
};
