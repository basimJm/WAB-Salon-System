import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { AVAILABILITY_ROUTES } from '../../../constants/availability';
import { HTTP_STATUS } from '../../../constants/http';
import { SALON_DETAILS_ROUTES } from '../../../constants/salonDetails';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { availabilityBody, availabilityParams } from './availability.validation';

export const registerCustomerAvailabilityDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'post',
    path: `${API_PREFIXES.customer}${SALON_DETAILS_ROUTES.base}${AVAILABILITY_ROUTES.availability.replace(':salonId', '{salonId}')}`,
    tags: ['Availability'],
    summary:
      'Slots of one person on one date with the free eligible staff per slot (a read; POST because of the body)',
    description:
      'Ask once per person; send the times the earlier persons picked in `others` so the same staff member is not offered twice. `reason` explains a day without slots: PAST, TOO_FAR or CLOSED. A slot is available when at least one eligible staff member is free for the whole duration (existing PENDING/APPROVED bookings and live payment holds count as busy).',
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      params: availabilityParams,
      body: { content: { 'application/json': { schema: availabilityBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Slots',
        successResponseSchema(
          z.object({
            date: z.string(),
            reason: z.enum(['PAST', 'TOO_FAR', 'CLOSED']).nullable(),
            durationMinutes: z.number(),
            slots: z.array(
              z.object({
                start: z.string(),
                end: z.string(),
                available: z.boolean(),
                eligibleStaffIds: z.array(z.string()),
              }),
            ),
          }),
        ),
      ),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.forbidden,
        HTTP_STATUS.notFound,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};
