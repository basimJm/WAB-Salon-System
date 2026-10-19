import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_SALON_EDIT_ROUTES } from '../../../constants/adminSalonEdit';
import type { AdminSalonEditService } from '../../../domain/adminSalonEdit/adminSalonEdit.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  addGalleryBody,
  editProfileBody,
  galleryItemParams,
  reasonBody,
  reorderGalleryBody,
  salonParams,
} from './salonEdit.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params'): z.infer<S> =>
  (req.validated as Record<string, z.infer<S>>)[key] as z.infer<S>;

/** Admin edits for a salon (Admin PRD A13): same data as the merchant app, with reason + audit + owner notice. */
export const createAdminSalonEditRouter = (
  service: AdminSalonEditService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  const routes = ADMIN_SALON_EDIT_ROUTES;

  router.get(
    routes.profile,
    validate({ params: salonParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      sendSuccess(req, res, { data: await service.profile(id) });
    }),
  );
  router.patch(
    routes.profile,
    validate({ params: salonParams, body: editProfileBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { reason, ...patch } = part<typeof editProfileBody>(req, 'body');
      sendSuccess(req, res, {
        data: await service.updateProfile({ salonId: id, reason, actor: toActor(req), patch }),
      });
    }),
  );
  router.get(
    routes.gallery,
    validate({ params: salonParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      sendSuccess(req, res, { data: await service.gallery(id) });
    }),
  );
  router.post(
    routes.gallery,
    validate({ params: salonParams, body: addGalleryBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const body = part<typeof addGalleryBody>(req, 'body');
      sendCreated(
        req,
        res,
        await service.addGalleryItem({ ...body, salonId: id, actor: toActor(req) }),
      );
    }),
  );
  router.put(
    routes.galleryOrder,
    validate({ params: salonParams, body: reorderGalleryBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { ids, reason } = part<typeof reorderGalleryBody>(req, 'body');
      sendSuccess(req, res, {
        data: await service.reorderGallery({ salonId: id, ids, reason, actor: toActor(req) }),
      });
    }),
  );
  router.post(
    routes.galleryRemove,
    validate({ params: galleryItemParams, body: reasonBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id, itemId } = part<typeof galleryItemParams>(req, 'params');
      const { reason } = part<typeof reasonBody>(req, 'body');
      await service.removeGalleryItem({ salonId: id, itemId, reason, actor: toActor(req) });
      sendSuccess(req, res, { data: null });
    }),
  );
  return router;
};
