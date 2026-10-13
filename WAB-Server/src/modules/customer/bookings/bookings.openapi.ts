import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { BOOKING_ROUTES, CUSTOMER_BOOKING_ROUTES } from '../../../constants/bookings';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { bookingIdParams, cancelBookingBody, createBookingBody } from './bookings.validation';

const summary = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  status: z.literal('PENDING'),
  paymentMethod: z.enum(['PAY_ON_ARRIVAL', 'DEPOSIT', 'FULL_ONLINE']),
  paymentStatus: z.string(),
  appointmentStart: z.string(),
  appointmentEnd: z.string(),
  respondBy: z.string(),
  money: z.object({
    total: z.string(),
    dueOnline: z.string(),
    paidOnline: z.string(),
    remaining: z.string(),
  }),
});

export const registerCustomerBookingDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'post',
    path: `${API_PREFIXES.customer}${BOOKING_ROUTES.base}`,
    tags: ['Bookings'],
    summary:
      'Create the booking from a confirmed draft (status PENDING, waits for the salon). Deposit and full-payment drafts are created from their verified payment (the booking then shows the paid amounts).',
    description:
      'Needs the draft’s OTP confirmation (`verify-otp`), else 422 `OTP_INVALID`. The slots are re-validated under a lock per staff member and date: a slot that went away answers 409 `SLOT_TAKEN`. An expired draft is 422 `DRAFT_EXPIRED`; an online draft needs a verified payment (SUCCEEDED, exact amount, not used before) else 422 `PAYMENT_NOT_VERIFIED`; when the slot went away after payment the whole payment is refunded at once and the answer is 409 `SLOT_TAKEN`.',
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      body: { content: { 'application/json': { schema: createBookingBody } } },
    },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Booking', successResponseSchema(summary)),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.forbidden,
        HTTP_STATUS.notFound,
        HTTP_STATUS.conflict,
        HTTP_STATUS.unprocessableEntity,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${API_PREFIXES.customer}${BOOKING_ROUTES.base}${CUSTOMER_BOOKING_ROUTES.cancel.replace(':id', '{id}')}`,
    tags: ['Bookings'],
    summary:
      'Cancel my booking: a pending one any time (full refund), an approved one only inside the salon’s cancellation window.',
    description:
      'After the window the answer is 422 `CANCELLATION_WINDOW_PASSED`. `refundDue` (JOD) is what the refund flow will return, by the salon’s policy.',
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      params: bookingIdParams,
      body: { content: { 'application/json': { schema: cancelBookingBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Cancelled booking',
        successResponseSchema(summary.extend({ status: z.string(), refundDue: z.string() })),
      ),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.forbidden,
        HTTP_STATUS.notFound,
        HTTP_STATUS.unprocessableEntity,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};
