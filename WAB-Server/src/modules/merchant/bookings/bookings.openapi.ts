import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { MERCHANT_BOOKING_ROUTES } from '../../../constants/bookings';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { bookingParams, decisionBody } from './bookings.validation';

const summary = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  status: z.string(),
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

interface Action {
  readonly path: string;
  readonly summary: string;
  readonly permission: string;
  readonly withReason: boolean;
}

const ACTIONS: readonly Action[] = [
  {
    path: MERCHANT_BOOKING_ROUTES.approve,
    summary: 'Approve a pending booking (staff are re-checked: 409 SLOT_TAKEN if no longer free)',
    permission: 'BOOKINGS_RESPOND',
    withReason: false,
  },
  {
    path: MERCHANT_BOOKING_ROUTES.reject,
    summary: 'Reject a pending booking (reason code required)',
    permission: 'BOOKINGS_RESPOND',
    withReason: true,
  },
  {
    path: MERCHANT_BOOKING_ROUTES.complete,
    summary: 'Mark an approved booking completed (not before its start time)',
    permission: 'BOOKINGS_OPERATE',
    withReason: false,
  },
  {
    path: MERCHANT_BOOKING_ROUTES.noShow,
    summary: 'Mark an approved booking as a no-show (not before its start time)',
    permission: 'BOOKINGS_OPERATE',
    withReason: false,
  },
  {
    path: MERCHANT_BOOKING_ROUTES.cancel,
    summary: 'Cancel an approved booking before its start time (reason code required)',
    permission: 'BOOKINGS_OPERATE',
    withReason: true,
  },
];

export const registerMerchantBookingDocs = (registry: OpenAPIRegistry): void => {
  for (const action of ACTIONS) {
    registry.registerPath({
      method: 'post',
      path: `${API_PREFIXES.merchant}${MERCHANT_BOOKING_ROUTES.base}${action.path.replace(':id', '{id}')}`,
      tags: ['Bookings'],
      summary: action.summary,
      description: `Needs the ${action.permission} permission (owner always). A booking that already left the expected status answers 422 ALREADY_HANDLED; a move the state machine forbids answers 422 INVALID_TRANSITION.`,
      request: {
        headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
        params: bookingParams,
        ...(action.withReason
          ? { body: { content: { 'application/json': { schema: decisionBody } } } }
          : {}),
      },
      responses: {
        [HTTP_STATUS.ok]: jsonResponse('Booking', successResponseSchema(summary)),
        ...errorResponses(
          HTTP_STATUS.badRequest,
          HTTP_STATUS.unauthorized,
          HTTP_STATUS.forbidden,
          HTTP_STATUS.notFound,
          HTTP_STATUS.conflict,
          HTTP_STATUS.unprocessableEntity,
          HTTP_STATUS.serviceUnavailable,
        ),
      },
    });
  }
};
