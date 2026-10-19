import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import type { AdminSearchService } from '../../../domain/adminSearch/adminSearch.service';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendSuccess } from '../../../utils/response/successResponse';
import { searchQuery } from './search.validation';

const queryOf = (req: Request): z.infer<typeof searchQuery> =>
  (req.validated as { query: z.infer<typeof searchQuery> }).query;

/** Global search of the admin panel (Admin PRD §3): grouped, paginated per group. */
export const createAdminSearchRouter = (
  service: AdminSearchService,
  guard: RequestHandler,
): Router => {
  const router = Router();
  router.use(guard);
  router.get(
    '/',
    validate({ query: searchQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { q, types, page, pageSize } = queryOf(req);
      const result = await service.search({ q, types, params: { page, pageSize } });
      sendSuccess(req, res, { data: { ...result, page, pageSize } });
    }),
  );
  return router;
};
