import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_SEARCH_ROUTES } from '../../../constants/adminSearch';
import { BOOKING_STATUSES, CUSTOMER_STATUSES, MEMBER_ROLES } from '../../../constants/enums';
import { HTTP_STATUS } from '../../../constants/http';
import { SALON_STATES } from '../../../constants/salon';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { businessKindShape } from '../../../docs/schemas';
import { searchQuery } from './search.validation';

const group = <T extends z.ZodType>(
  item: T,
): z.ZodObject<{ items: z.ZodArray<T>; total: z.ZodInt }> =>
  z.object({ items: z.array(item), total: z.int() });

const customer = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  status: z.enum(CUSTOMER_STATUSES),
});
const salon = z.object({
  id: z.string(),
  name: z.string(),
  ...businessKindShape,
  state: z.enum(SALON_STATES),
});
const booking = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  status: z.enum(BOOKING_STATUSES),
  appointmentStart: z.iso.datetime(),
  salonId: z.string(),
  customerId: z.string().nullable(),
});
const member = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  role: z.enum(MEMBER_ROLES),
  salonId: z.string(),
  active: z.boolean(),
});

export const registerAdminSearchDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES.admin}${ADMIN_SEARCH_ROUTES.base}`,
    tags: ['Admin search'],
    summary: 'Global search: customers, salons, bookings and team members',
    description:
      'One box for the panel. `q` is 2–100 characters and is always a literal (never a pattern). Customers and members match by name or phone (national number or with the dial code), salons by name, bookings by reference number (exact). Each requested group is paginated with the same `page`/`pageSize`; `types` (comma separated) limits the groups, absent = all four.',
    request: { headers: z.object({ 'Accept-Language': acceptLanguageHeader }), query: searchQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Grouped results',
        successResponseSchema(
          z.object({
            customers: group(customer).optional(),
            salons: group(salon).optional(),
            bookings: group(booking).optional(),
            members: group(member).optional(),
            page: z.int(),
            pageSize: z.int(),
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
};
