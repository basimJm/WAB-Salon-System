import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
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
import { salonParamsSchema, staffParamsSchema } from './salonDetails.validation';

const rating = z.object({ avg: z.number(), count: z.number() });
const reviewView = z.object({
  id: z.string(),
  customerName: z.string(),
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
  branch: z
    .object({ id: z.string(), name: z.string() })
    .nullable()
    .describe('The branch the review is about (label only)'),
});
const reviewsPreview = z.object({
  avg: z.number(),
  count: z.number(),
  latest: z.array(reviewView),
});
const staffSummary = z.object({
  id: z.string(),
  firstName: z.string(),
  photoUrl: z.string().nullable(),
  status: z.enum(['ON_DUTY', 'ON_LEAVE', 'DAY_OFF']),
  branchId: z.string().nullable().describe('The branch the staff member works at'),
});
const scheduleDay = z.object({
  day: z.string(),
  isOff: z.boolean(),
  open: z.string(),
  close: z.string(),
});
const closure = z.object({ from: z.string(), to: z.string(), reason: z.string() });
const branchSummary = z.object({
  id: z.string(),
  name: z.string(),
  isMain: z.boolean(),
  locationText: z.string().nullable(),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  isOpenNow: z.boolean(),
  todayHours: z.object({ open: z.string(), close: z.string() }).nullable(),
  closedReason: z.string().nullable(),
  weeklySchedule: z.array(scheduleDay),
  upcomingClosures: z.array(closure),
});
const details = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.enum(['MALE', 'FEMALE']),
  coverUrl: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  description: z.string().nullable(),
  locationText: z.string().nullable(),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  rating,
  isOpenNow: z.boolean(),
  todayHours: z.object({ open: z.string(), close: z.string() }).nullable(),
  closedReason: z.string().nullable(),
  weeklySchedule: z.array(scheduleDay),
  upcomingClosures: z.array(closure),
  staff: z.array(staffSummary),
  branches: z
    .array(branchSummary)
    .describe('Bookable branches, main first; the place fields above are the main branch'),
  services: z.array(
    z.object({
      id: z.string(),
      branchId: z.string().nullable().describe('The branch offering the service at this price'),
      catalogServiceId: z.string(),
      name: z.string(),
      imageUrl: z.string(),
      description: z.string().nullable(),
      price: z.string().describe('JOD, 3 decimals'),
      durationMinutes: z.number(),
      mediaUrls: z.array(z.string()),
    }),
  ),
  gallery: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['IMAGE', 'VIDEO']),
      url: z.string(),
      thumbnailUrl: z.string().nullable(),
      durationSec: z.number().nullable(),
    }),
  ),
  isFavorite: z.boolean(),
  reviews: reviewsPreview,
});
const staffDetails = staffSummary.extend({
  role: z.enum(['OWNER', 'MANAGER', 'EMPLOYEE']),
  rating,
  bio: z.string().nullable(),
  yearsOfExperience: z.number().nullable(),
  customersCount: z.number(),
  workingDays: z.array(
    z.object({ day: z.string(), start: z.string().nullable(), end: z.string().nullable() }),
  ),
  services: z.array(
    z.object({
      id: z.string().describe('Salon service id (what bookings and availability take)'),
      catalogServiceId: z.string(),
      name: z.string(),
    }),
  ),
  reviews: reviewsPreview,
});

export const registerCustomerSalonDetailsDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.customer}${SALON_DETAILS_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.notFound,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path: `${base}/{salonId}`,
    tags: ['Salon details'],
    summary: 'Salon details (S07): hours, closures, staff, services, gallery',
    description:
      'Public; a valid customer token only adds `isFavorite`. A salon that is not LIVE and complete is 404 `SALON_NOT_FOUND`.',
    security: [],
    request: { headers, params: salonParamsSchema },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Salon', successResponseSchema(details)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{salonId}/staff/{memberId}`,
    tags: ['Salon details'],
    summary: 'Staff sheet of a salon member who provides services',
    security: [],
    request: { headers, params: staffParamsSchema },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Staff member', successResponseSchema(staffDetails)),
      ...failures,
    },
  });
};
