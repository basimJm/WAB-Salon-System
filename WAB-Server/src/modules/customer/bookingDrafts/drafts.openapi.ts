import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { BOOKING_DRAFT_ROUTES } from '../../../constants/bookingDrafts';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { createDraftBody, draftParams, verifyOtpBody } from './drafts.validation';

const draft = z.object({
  id: z.string(),
  salon: z.object({ id: z.string(), name: z.string() }),
  branch: z
    .object({ id: z.string(), name: z.string(), locationText: z.string().nullable() })
    .nullable()
    .describe('The branch of the appointment'),
  expiresAt: z.string(),
  paymentMethod: z.enum(['PAY_ON_ARRIVAL', 'DEPOSIT', 'FULL_ONLINE']),
  persons: z.array(
    z.object({
      name: z.string(),
      isMain: z.boolean(),
      isBride: z.boolean(),
      services: z.array(
        z.object({
          salonServiceId: z.string(),
          name: z.string(),
          price: z.string(),
          durationMinutes: z.number(),
        }),
      ),
      staff: z.object({ id: z.string(), firstName: z.string() }),
      staffSelection: z.enum(['SPECIFIC', 'ANY']),
      start: z.string(),
      end: z.string(),
      subtotal: z.string(),
    }),
  ),
  money: z.object({
    total: z.string(),
    deposit: z.string(),
    dueOnline: z.string(),
    remaining: z.string(),
  }),
  policy: z.object({
    cancellationWindowHours: z.number(),
    paymentOptions: z.array(z.string()),
    depositPercentage: z.number().optional(),
    depositRefundableOnCustomerCancel: z.boolean(),
    fullPaymentRefundOnCustomerCancel: z.string(),
    noShowDeposit: z.string(),
    noShowFullPayment: z.string(),
    notes: z.string().optional(),
  }),
});

export const registerCustomerBookingDraftDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.customer}${BOOKING_DRAFT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Booking drafts'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'post',
    path: base,
    tags,
    summary:
      'Validate and price a booking (summary step), hold the slots for `booking.paymentHoldMinutes` and snapshot prices and the salon policy. Replaces the customer’s earlier draft.',
    description:
      'Persons are checked in order and each pick blocks the next. Errors (422): SALON_NOT_BOOKABLE, TOO_MANY_COMPANIONS, GENDER_MISMATCH, SERVICE_UNAVAILABLE, BRIDE_ONLY_SERVICE, STAFF_NOT_ELIGIBLE, SALON_CLOSED, DATE_OUT_OF_RANGE, SLOT_UNAVAILABLE, PAYMENT_OPTION_NOT_ALLOWED.',
    request: {
      headers,
      body: { content: { 'application/json': { schema: createDraftBody } } },
    },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Draft', successResponseSchema(draft)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{id}`,
    tags,
    summary: 'My draft; an expired one is 422 `DRAFT_EXPIRED`',
    request: { headers, params: draftParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Draft', successResponseSchema(draft)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}/{id}/verify-otp`,
    tags,
    summary:
      'Confirm the booking with the OTP (purpose BOOKING_CONFIRMATION): the `otpToken` (from `POST /auth/otp/verify`) must belong to the customer’s own phone; it works once. Required before the booking is created.',
    request: {
      headers,
      params: draftParams,
      body: { content: { 'application/json': { schema: verifyOtpBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Verified',
        successResponseSchema(z.object({ otpVerifiedAt: z.string() })),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'delete',
    path: `${base}/{id}`,
    tags,
    summary: 'Discard my draft and free its held slots (idempotent)',
    request: { headers, params: draftParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Discarded', successResponseSchema(z.null())),
      ...failures,
    },
  });
};
