import { Router, type RequestHandler } from 'express';
import { CONTENT_ROUTES } from '../../../constants/content';
import type { ContentService } from '../../../domain/content';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { createContentController } from './content.controller';
import { pageParamsSchema } from './content.validation';

export const createContentRouter = (service: ContentService, limiter: RequestHandler): Router => {
  const router = Router();
  const controller = createContentController(service);
  router.get(
    `${CONTENT_ROUTES.pages}/:slug`,
    limiter,
    validate({ params: pageParamsSchema }),
    asyncHandler(controller.page),
  );
  router.get(CONTENT_ROUTES.faqs, limiter, asyncHandler(controller.faqs));
  return router;
};
