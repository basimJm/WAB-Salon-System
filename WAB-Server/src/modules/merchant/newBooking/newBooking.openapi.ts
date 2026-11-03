import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { MERCHANT_BOOKING_ROUTES, MERCHANT_NEW_BOOKING_ROUTES } from '../../../constants/bookings';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { customerLookupQuery, merchantBookingBody } from './newBooking.validation';

const headers = z.object({ 'Accept-Language': acceptLanguageHeader });

/** Business-made bookings (§5.20): lookup + create. */
export const registerMerchantNewBookingDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES.merchant}${MERCHANT_NEW_BOOKING_ROUTES.customersBase}${MERCHANT_NEW_BOOKING_ROUTES.lookup}`,
    tags: ['Bookings'],
    summary: 'Is this mobile number a WAB customer? (before booking for them, §5.20)',
    description:
      'Needs BOOKINGS_CREATE. Rate-limited per IP. A registered, active account answers its first name and gender only; anything else `registered: false` (or true with nulls for a blocked account).',
    request: { headers, query: customerLookupQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Lookup',
        successResponseSchema(
          z.object({
            registered: z.boolean(),
            firstName: z.string().nullable(),
            gender: z.enum(['MALE', 'FEMALE']).nullable(),
          }),
        ),
      ),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.forbidden,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${API_PREFIXES.merchant}${MERCHANT_BOOKING_ROUTES.base}`,
    tags: ['Bookings'],
    summary: 'Book for a customer with or without the app (§5.20): APPROVED, pay at the business',
    description:
      'Needs BOOKINGS_CREATE (a branch member books their own branch: 403 `BRANCH_SCOPE_DENIED`). Same persons, audience (`GENDER_MISMATCH`), bride, service, staff and slot rules as the app; created under the staff locks (409 `SLOT_TAKEN`). A registered number links the booking to that account and notifies it ("Booked by"); a blocked account answers 403 `ACCOUNT_BLOCKED`; an unknown number needs `customer.name` + `customer.gender` and gets no message. Tattoo studios may attach `persons[].referenceImageKey` (a member `BOOKING_REFERENCE` upload of this salon).',
    request: {
      headers,
      body: { content: { 'application/json': { schema: merchantBookingBody } } },
    },
    responses: {
      [HTTP_STATUS.created]: jsonResponse(
        'Booking',
        successResponseSchema(
          z.object({
            id: z.string(),
            referenceNumber: z.string(),
            status: z.string(),
            paymentMethod: z.string(),
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
            customerRegistered: z.boolean(),
          }),
        ),
      ),
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
};
