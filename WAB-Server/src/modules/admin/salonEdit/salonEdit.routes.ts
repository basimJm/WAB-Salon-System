import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import { ADMIN_SALON_EDIT_ROUTES } from '../../../constants/adminSalonEdit';
import type { AdminSalonEditService } from '../../../domain/adminSalonEdit/adminSalonEdit.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { toActor } from '../crud/actor';
import {
  addGalleryBody,
  addServiceBody,
  closureBody,
  closureParams,
  closurePatchBody,
  hoursBody,
  policyBody,
  previewClosureBody,
  previewHoursBody,
  serviceParams,
  servicesQuery,
  staffBody,
  staffParams,
  updateServiceBody,
  editProfileBody,
  galleryItemParams,
  reasonBody,
  reorderGalleryBody,
  salonParams,
} from './salonEdit.validation';

const part = <S extends z.ZodType>(req: Request, key: 'body' | 'params' | 'query'): z.infer<S> =>
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

  // Working hours and closures (the previews change nothing and list the bookings a change would break).
  router.get(
    routes.hours,
    validate({ params: salonParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      sendSuccess(req, res, { data: await service.hours(id) });
    }),
  );
  router.post(
    routes.hoursPreview,
    validate({ params: salonParams, body: previewHoursBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { days } = part<typeof previewHoursBody>(req, 'body');
      sendSuccess(req, res, { data: await service.previewWeekly({ salonId: id, days }) });
    }),
  );
  router.put(
    routes.hours,
    validate({ params: salonParams, body: hoursBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { days, reason } = part<typeof hoursBody>(req, 'body');
      sendSuccess(req, res, {
        data: await service.setWeekly({ salonId: id, days, reason, actor: toActor(req) }),
      });
    }),
  );
  router.post(
    routes.closuresPreview,
    validate({ params: salonParams, body: previewClosureBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { from, to } = part<typeof previewClosureBody>(req, 'body');
      sendSuccess(req, res, { data: await service.previewClosure({ salonId: id, from, to }) });
    }),
  );
  router.post(
    routes.closures,
    validate({ params: salonParams, body: closureBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const body = part<typeof closureBody>(req, 'body');
      sendCreated(
        req,
        res,
        await service.addClosure({ ...body, salonId: id, actor: toActor(req) }),
      );
    }),
  );
  router.patch(
    routes.closure,
    validate({ params: closureParams, body: closurePatchBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id, closureId } = part<typeof closureParams>(req, 'params');
      const body = part<typeof closurePatchBody>(req, 'body');
      sendSuccess(req, res, {
        data: await service.updateClosure({ ...body, salonId: id, closureId, actor: toActor(req) }),
      });
    }),
  );
  router.post(
    routes.closureRemove,
    validate({ params: closureParams, body: reasonBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id, closureId } = part<typeof closureParams>(req, 'params');
      const { reason } = part<typeof reasonBody>(req, 'body');
      await service.removeClosure({ salonId: id, closureId, reason, actor: toActor(req) });
      sendSuccess(req, res, { data: null });
    }),
  );

  // Services of the salon (prices in JOD strings on the wire, like the merchant app).
  router.get(
    routes.services,
    validate({ params: salonParams, query: servicesQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { page, pageSize } = part<typeof servicesQuery>(req, 'query');
      const result = await service.services({
        salonId: id,
        language: req.language,
        params: { page, pageSize },
      });
      sendPaginated(req, res, result.items, { page, pageSize }, result.meta.total);
    }),
  );
  router.post(
    routes.services,
    validate({ params: salonParams, body: addServiceBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { catalogServiceId, reason, ...fields } = part<typeof addServiceBody>(req, 'body');
      sendCreated(
        req,
        res,
        await service.addService({
          salonId: id,
          language: req.language,
          catalogServiceId,
          fields,
          reason,
          actor: toActor(req),
        }),
      );
    }),
  );
  router.patch(
    routes.service,
    validate({ params: serviceParams, body: updateServiceBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id, serviceId } = part<typeof serviceParams>(req, 'params');
      const { reason, ...fields } = part<typeof updateServiceBody>(req, 'body');
      sendSuccess(req, res, {
        data: await service.updateService({
          salonId: id,
          language: req.language,
          serviceId,
          fields,
          reason,
          actor: toActor(req),
        }),
      });
    }),
  );

  // A member's staff profile.
  router.get(
    routes.staff,
    validate({ params: staffParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id, memberId } = part<typeof staffParams>(req, 'params');
      sendSuccess(req, res, { data: await service.staff({ salonId: id, memberId }) });
    }),
  );
  router.put(
    routes.staff,
    validate({ params: staffParams, body: staffBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id, memberId } = part<typeof staffParams>(req, 'params');
      const { reason, ...profile } = part<typeof staffBody>(req, 'body');
      sendSuccess(req, res, {
        data: await service.setStaff({
          salonId: id,
          memberId,
          profile,
          reason,
          actor: toActor(req),
        }),
      });
    }),
  );

  // Policies (replaced as a whole).
  router.get(
    routes.policy,
    validate({ params: salonParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      sendSuccess(req, res, { data: await service.policy(id) });
    }),
  );
  router.put(
    routes.policy,
    validate({ params: salonParams, body: policyBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = part<typeof salonParams>(req, 'params');
      const { reason, ...policy } = part<typeof policyBody>(req, 'body');
      sendSuccess(req, res, {
        data: await service.setPolicy({ salonId: id, policy, reason, actor: toActor(req) }),
      });
    }),
  );
  return router;
};
