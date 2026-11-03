import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  BOOKING_ROUTES,
  ADMIN_BOOKING_ROUTES,
  ADMIN_BOOKING_STATUS_ROUTE,
  MERCHANT_BOOKING_QUERY_ROUTES,
  MERCHANT_BOOKING_ROUTES,
} from '../../../constants/bookings';
import { statusChangeBody } from '../../admin/bookings/bookings.validation';
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
  adminBookingsQuery,
  bookingIdParams,
  calendarQuery,
  customerBookingsQuery,
  merchantBookingsQuery,
} from './bookingQuery.schemas';
import { audienceSchema, businessTypeSchema } from '../../../docs/schemas';
import { GENDERS } from '../../../constants/enums';

const person = z.object({ id: z.string(), name: z.string() });
const staffRef = person
  .extend({
    firstName: z.string(),
    photoUrl: z.string().nullable(),
  })
  .describe(
    'Assigned staff member. Customer view: first name only (`name` = `firstName`); merchant/admin: `name` is the full name.',
  );
const decision = z.object({
  reasonCode: z.string(),
  reasonText: z.string().nullable(),
  at: z.string(),
});
const row = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  status: z.string(),
  businessType: businessTypeSchema,
  salonAudience: audienceSchema,
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  hasBride: z.boolean(),
  appointmentStart: z.string(),
  appointmentEnd: z.string(),
  respondBy: z.string(),
  requestedAt: z.string().describe('When the customer sent the request'),
  personsCount: z.number(),
  total: z.string().describe('JOD decimal string'),
  salon: person.nullable().describe('Customer and admin views only.'),
  branch: z
    .object({ id: z.string(), name: z.string(), locationText: z.string().nullable() })
    .nullable()
    .describe(
      'The branch as booked, name in the request language; null for bookings made before branches.',
    ),
  customer: z
    .object({ id: z.string().nullable(), name: z.string(), phone: z.string() })
    .nullable()
    .describe(
      'Merchant and admin views only. `id` is null for a business-made booking of someone without the app (§5.20): name and phone as entered.',
    ),
  source: z
    .enum(['CUSTOMER_APP', 'MERCHANT'])
    .describe(
      'Who made the booking (§5.20); the customer app shows "Booked by <place>" for MERCHANT.',
    ),
  createdBy: person
    .nullable()
    .describe(
      'The member who made a MERCHANT booking; null otherwise and always in the customer view.',
    ),
  staff: z.array(staffRef).describe('The distinct staff of the booking (every view).'),
  rejection: decision.nullable().describe('The salon’s rejection reason; null unless REJECTED.'),
});
/** A booking row as lists show it (also reused by the merchant dashboard). */
export const bookingRowDoc = row;

const detail = row.extend({
  refundStatus: z.string(),
  persons: z.array(
    z.object({
      name: z.string(),
      isBride: z.boolean(),
      gender: z.enum(GENDERS).nullable(),
      referenceImageUrl: z
        .string()
        .nullable()
        .describe('Tattoo design image (§5.23): short-lived signed URL; null when none.'),
      start: z.string(),
      end: z.string(),
      subtotal: z.string(),
      staff: staffRef.nullable(),
      services: z.array(
        z.object({ name: z.string(), price: z.string(), durationMinutes: z.number() }),
      ),
    }),
  ),
  money: z.object({
    total: z.string(),
    dueOnline: z.string(),
    paidOnline: z.string(),
    remaining: z
      .string()
      .describe(
        'Still to pay at the salon now (JOD): total − paidOnline while PENDING/APPROVED, 0 once the booking is final.',
      ),
    paidAtSalon: z
      .string()
      .describe('Collected in person (JOD): the at-salon part once COMPLETED, else 0.'),
    refunded: z.string(),
  }),
  policy: z
    .record(z.string(), z.unknown())
    .describe('The salon policy snapshotted at booking time.'),
  statusHistory: z.array(
    z.object({
      status: z.string(),
      actorType: z.string(),
      reason: z.string().nullable(),
      at: z.string(),
    }),
  ),
  cancellation: decision.nullable(),
  createdAt: z.string(),
  actions: z
    .array(z.enum(['APPROVE', 'REJECT', 'CANCEL', 'REASSIGN', 'COMPLETE', 'NO_SHOW']))
    .describe('What the signed-in member may do now (merchant view).'),
});
const block = z.object({
  bookingId: z.string(),
  referenceNumber: z.string(),
  status: z.string(),
  staffId: z.string(),
  personName: z.string(),
  isBride: z.boolean(),
  start: z.string(),
  end: z.string(),
});

const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
const failures = errorResponses(
  HTTP_STATUS.badRequest,
  HTTP_STATUS.unauthorized,
  HTTP_STATUS.forbidden,
  HTTP_STATUS.notFound,
  HTTP_STATUS.serviceUnavailable,
);

const register = (
  registry: OpenAPIRegistry,
  input: {
    path: string;
    summary: string;
    query?: z.ZodObject;
    params?: z.ZodObject;
    data: z.ZodType;
    tag: string;
  },
): void => {
  registry.registerPath({
    method: 'get',
    path: input.path,
    tags: [input.tag],
    summary: input.summary,
    request: {
      headers,
      ...(input.query === undefined ? {} : { query: input.query }),
      ...(input.params === undefined ? {} : { params: input.params }),
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('OK', successResponseSchema(input.data)),
      ...failures,
    },
  });
};

export const registerCustomerBookingQueryDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.customer}${BOOKING_ROUTES.base}`;
  register(registry, {
    path: base,
    summary: 'My bookings: upcoming or past, search by reference or salon name (paginated)',
    query: customerBookingsQuery,
    data: z.array(row),
    tag: 'Bookings',
  });
  register(registry, {
    path: `${base}/{id}`,
    summary: 'One of my bookings with persons, money, policy snapshot and status history',
    params: bookingIdParams,
    data: detail,
    tag: 'Bookings',
  });
};

export const registerMerchantBookingQueryDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.merchant}${MERCHANT_BOOKING_ROUTES.base}`;
  register(registry, {
    path: base,
    summary:
      'Salon bookings by tab (pending, upcoming, today, past) with search and filters. BOOKINGS_VIEW_OWN sees only bookings assigned to the caller.',
    query: merchantBookingsQuery,
    data: z.array(row),
    tag: 'Bookings',
  });
  register(registry, {
    path: `${base}${MERCHANT_BOOKING_QUERY_ROUTES.calendar}`,
    summary: `Calendar blocks per person and staff member for up to 7 days (from/to are Amman dates, inclusive).`,
    query: calendarQuery,
    data: z.array(block),
    tag: 'Bookings',
  });
  register(registry, {
    path: `${base}/{id}`,
    summary: 'Booking details with the actions the caller may take now',
    params: bookingIdParams,
    data: detail,
    tag: 'Bookings',
  });
};

export const registerAdminBookingQueryDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_BOOKING_ROUTES.base}`;
  register(registry, {
    path: base,
    summary:
      'All bookings with filters (status, dates, salon, customer, payment, bride) and search',
    query: adminBookingsQuery,
    data: z.array(row),
    tag: 'Bookings',
  });
  register(registry, {
    path: `${base}/{id}`,
    summary: 'Booking details for the admin',
    params: bookingIdParams,
    data: detail,
    tag: 'Bookings',
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${ADMIN_BOOKING_STATUS_ROUTE.replace(':id', '{id}')}`,
    tags: ['Bookings'],
    summary: 'Move a booking to any other status with a mandatory reason (audited)',
    description:
      'Admin may make any change away from the current status (BUSINESS_DOMAIN §5.7). `irregular` is true when no actor could make that move by the normal rules (e.g. reverting a final status). Putting a booking back on the calendar needs its staff to be free (409 `SLOT_TAKEN`). Refunds and notifications follow through the refund and notification flows.',
    request: {
      headers,
      params: bookingIdParams,
      body: { content: { 'application/json': { schema: statusChangeBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Booking',
        successResponseSchema(
          row
            .pick({ id: true, referenceNumber: true, status: true })
            .extend({ irregular: z.boolean() }),
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
