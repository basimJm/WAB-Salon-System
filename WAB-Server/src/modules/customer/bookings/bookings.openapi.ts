import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { BOOKING_ROUTES } from '../../../constants/bookings';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { createBookingBody } from './bookings.validation';

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
      'Create the booking from a confirmed draft (status PENDING, waits for the salon). Pay-on-arrival drafts only for now; online payment arrives with the paid flow.',
    description:
      'Needs the draft’s OTP confirmation (`verify-otp`), else 422 `OTP_INVALID`. The slots are re-validated under a lock per staff member and date: a slot that went away answers 409 `SLOT_TAKEN`. An expired draft is 422 `DRAFT_EXPIRED`; an online method without a verified payment is 422 `PAYMENT_NOT_VERIFIED`.',
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
};
