import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  BOOKING_ROUTES,
  ADMIN_BOOKING_ROUTES,
  MERCHANT_BOOKING_QUERY_ROUTES,
  MERCHANT_BOOKING_ROUTES,
} from '../../../constants/bookings';
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

const person = z.object({ id: z.string(), name: z.string() });
const row = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  status: z.string(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  hasBride: z.boolean(),
  appointmentStart: z.string(),
  appointmentEnd: z.string(),
  respondBy: z.string(),
  personsCount: z.number(),
  total: z.string().describe('JOD decimal string'),
  salon: person.nullable().describe('Customer and admin views only.'),
  customer: person
    .extend({ phone: z.string() })
    .nullable()
    .describe('Merchant and admin views only.'),
  staff: z.array(person).describe('Merchant and admin views only.'),
});
const detail = row.extend({
  refundStatus: z.string(),
  persons: z.array(
    z.object({
      name: z.string(),
      isBride: z.boolean(),
      start: z.string(),
      end: z.string(),
      subtotal: z.string(),
      staff: person.nullable(),
      services: z.array(
        z.object({ name: z.string(), price: z.string(), durationMinutes: z.number() }),
      ),
    }),
  ),
  money: z.object({
    total: z.string(),
    dueOnline: z.string(),
    paidOnline: z.string(),
    remaining: z.string(),
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
  rejection: z
    .object({ reasonCode: z.string(), reasonText: z.string().nullable(), at: z.string() })
    .nullable(),
  cancellation: z
    .object({ reasonCode: z.string(), reasonText: z.string().nullable(), at: z.string() })
    .nullable(),
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
};
