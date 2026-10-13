import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { z } from 'zod';
import {
  MERCHANT_BOOKING_QUERY_ROUTES,
  MERCHANT_BOOKING_ROUTES,
} from '../../../constants/bookings';
import type { BookingQueriesService } from '../../../domain/bookings/bookingQueries.service';
import type { BookingReassignService } from '../../../domain/bookings/bookingReassign.service';
import type { BookingActionsService } from '../../../domain/bookings/bookingActions.service';
import { requirePermission } from '../../../middlewares/permission';
import { validate } from '../../../middlewares/validate';
import { asyncHandler } from '../../../utils/async';
import { sendPaginated, sendSuccess } from '../../../utils/response/successResponse';
import { unavailableBookingReassign } from '../../services';
import {
  bookingIdParams,
  calendarQuery,
  merchantBookingsQuery,
} from '../../shared/bookings/bookingQuery.schemas';
import { unavailableBookingQueries } from '../../services';
import { presentSummary } from '../../customer/bookings/bookings.routes';
import { bookingParams, decisionBody, reassignBody } from './bookings.validation';

/** Salon-side booking decisions; each needs the permission of its transition (§5.7). */
export const createMerchantBookingsRouter = (
  service: BookingActionsService,
  guard: readonly RequestHandler[],
  reassign?: BookingReassignService,
  queries?: BookingQueriesService,
): Router => {
  const router = Router();
  const routes = MERCHANT_BOOKING_ROUTES;
  router.use(...guard);
  const target = (
    req: Request,
  ): {
    salonId: string;
    bookingId: string;
    member: { id: string; permissions: readonly string[] };
  } => {
    const { id } = (req.validated as { params: z.infer<typeof bookingParams> }).params;
    return {
      salonId: req.member?.salonId ?? '',
      bookingId: id,
      member: { id: req.member?.id ?? '', permissions: req.member?.permissions ?? [] },
    };
  };
  const body = (req: Request): z.infer<typeof decisionBody> =>
    (req.validated as { body: z.infer<typeof decisionBody> }).body;

  const reads = queries ?? unavailableBookingQueries;
  const viewer = requirePermission(['BOOKINGS_VIEW_ALL', 'BOOKINGS_VIEW_OWN'], 'any');
  const memberOf = (req: Request): { id: string; permissions: readonly string[] } => ({
    id: req.member?.id ?? '',
    permissions: req.member?.permissions ?? [],
  });
  router.get(
    '/',
    viewer,
    validate({ query: merchantBookingsQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, staffId, status, ...query } = (
        req.validated as { query: z.infer<typeof merchantBookingsQuery> }
      ).query;
      const result = await reads.list({
        audience: { kind: 'MERCHANT', salonId: req.member?.salonId ?? '', member: memberOf(req) },
        query: { ...query, staffIds: staffId, statuses: status },
        params: { page, pageSize },
        language: req.language,
      });
      sendPaginated(req, res, result.items, { page, pageSize }, result.total);
    }),
  );
  router.get(
    MERCHANT_BOOKING_QUERY_ROUTES.calendar,
    viewer,
    validate({ query: calendarQuery }),
    asyncHandler(async (req: Request, res: Response) => {
      const { from, to, staffId } = (req.validated as { query: z.infer<typeof calendarQuery> })
        .query;
      sendSuccess(req, res, {
        data: await reads.calendar({
          salonId: req.member?.salonId ?? '',
          member: memberOf(req),
          from,
          to,
          staffIds: staffId,
        }),
      });
    }),
  );
  router.get(
    MERCHANT_BOOKING_QUERY_ROUTES.byId,
    viewer,
    validate({ params: bookingIdParams }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = (req.validated as { params: { id: string } }).params;
      sendSuccess(req, res, {
        data: await reads.detail({
          audience: { kind: 'MERCHANT', salonId: req.member?.salonId ?? '', member: memberOf(req) },
          bookingId: id,
          language: req.language,
        }),
      });
    }),
  );

  const simple = (
    path: string,
    permission: 'BOOKINGS_RESPOND' | 'BOOKINGS_OPERATE',
    run: (t: ReturnType<typeof target>) => ReturnType<BookingActionsService['approve']>,
  ): void => {
    router.post(
      path,
      requirePermission([permission]),
      validate({ params: bookingParams }),
      asyncHandler(async (req: Request, res: Response) => {
        sendSuccess(req, res, { data: presentSummary(await run(target(req))) });
      }),
    );
  };
  const withReason = (
    path: string,
    permission: 'BOOKINGS_RESPOND' | 'BOOKINGS_OPERATE',
    run: (
      t: ReturnType<typeof target> & z.infer<typeof decisionBody>,
    ) => ReturnType<BookingActionsService['approve']>,
  ): void => {
    router.post(
      path,
      requirePermission([permission]),
      validate({ params: bookingParams, body: decisionBody }),
      asyncHandler(async (req: Request, res: Response) => {
        sendSuccess(req, res, {
          data: presentSummary(await run({ ...target(req), ...body(req) })),
        });
      }),
    );
  };
  simple(routes.approve, 'BOOKINGS_RESPOND', (t) => service.approve(t));
  withReason(routes.reject, 'BOOKINGS_RESPOND', (t) => service.reject(t));
  simple(routes.complete, 'BOOKINGS_OPERATE', (t) => service.complete(t));
  simple(routes.noShow, 'BOOKINGS_OPERATE', (t) => service.noShow(t));
  withReason(routes.cancel, 'BOOKINGS_OPERATE', (t) => service.cancel(t));
  router.post(
    routes.reassign,
    requirePermission(['BOOKINGS_OPERATE']),
    validate({ params: bookingParams, body: reassignBody }),
    asyncHandler(async (req: Request, res: Response) => {
      const { personIndex, staffId } = (req.validated as { body: z.infer<typeof reassignBody> })
        .body;
      const result = await (reassign ?? unavailableBookingReassign).reassign({
        ...target(req),
        personIndex,
        staffId,
      });
      sendSuccess(req, res, { data: presentSummary(result) });
    }),
  );
  return router;
};
