import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_BOOKING_EXTRA_ROUTES, ADMIN_CANCEL_MODES } from '../../../constants/bookings';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { BOOKING_STATUSES } from '../../../constants/enums';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  bookingParams,
  cancelBody,
  eligibleQuery,
  reassignBody,
  refundBody,
} from './bookingExtras.validation';

const summary = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  status: z.enum(BOOKING_STATUSES),
  appointmentStart: z.string(),
  appointmentEnd: z.string(),
  money: z.object({
    total: z.string(),
    dueOnline: z.string(),
    paidOnline: z.string(),
    remaining: z.string(),
  }),
});
const body = (
  schema: z.ZodType,
): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
  required: true,
  content: { [JSON_CONTENT_TYPE]: { schema } },
});

export const registerAdminBookingExtrasDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}/bookings`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin bookings'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const path = (route: string): string => `${base}${route.replace(/:(\w+)/g, '{$1}')}`;
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_BOOKING_EXTRA_ROUTES.eligibleStaff),
    tags,
    summary: 'Staff who could take over one person of an APPROVED booking',
    description:
      'Skills, bride qualification, hours, leave and a free slot are checked; the current staff member is left out. Advisory: the reassignment re-checks under the staff lock.',
    request: { headers, params: bookingParams, query: eligibleQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Eligible staff',
        successResponseSchema(z.array(z.object({ staffId: z.string(), name: z.string() }))),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_BOOKING_EXTRA_ROUTES.reassign),
    tags,
    summary: 'Reassign one person of an APPROVED booking to another staff member',
    description:
      'Same rules as the salon app (409 `SLOT_TAKEN`, 422 for ineligible staff or a booking that is not APPROVED/in the future). Needs a reason, is audited; customer, salon and staff are notified and sockets updated.',
    request: { headers, params: bookingParams, body: body(reassignBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Booking', successResponseSchema(summary)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_BOOKING_EXTRA_ROUTES.cancel),
    tags,
    summary: 'Cancel a PENDING or APPROVED booking by mode',
    description: `Modes: ${ADMIN_CANCEL_MODES.map((m) => `\`${m}\``).join(', ')}. CUSTOMER = as if the customer cancelled (refund by the snapshotted policy; everything while PENDING), SALON = the salon cancels (full refund), ADMIN = platform decision (full refund; recorded as a salon-side cancellation because no separate status exists, the history keeps the admin as the actor). 422 \`INVALID_TRANSITION\` for other statuses (use the status endpoint). Needs a reason, is audited; refunds start through the refund engine and the parties are notified.`,
    request: { headers, params: bookingParams, body: body(cancelBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Booking',
        successResponseSchema(summary.extend({ irregular: z.boolean() })),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_BOOKING_EXTRA_ROUTES.refund),
    tags,
    summary: 'Refund a chosen amount of the online payment',
    description:
      '`amount` is a JOD string above zero and at most what is still refundable (400 `body.amount`). 422 `INVALID_TRANSITION` when nothing was paid online. The refund starts at once and retries like any refund; while payments are paused nothing can have been paid, so it answers 422. Needs a reason, is audited.',
    request: { headers, params: bookingParams, body: body(refundBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Refund',
        successResponseSchema(z.object({ id: z.string(), amount: z.string(), status: z.string() })),
      ),
      ...failures,
    },
  });
};
