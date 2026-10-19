import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_SALON_EDIT_ROUTES } from '../../../constants/adminSalonEdit';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { GENDERS } from '../../../constants/enums';
import {
  FULL_PAYMENT_REFUND_RULES,
  NO_SHOW_DEPOSIT_RULES,
  NO_SHOW_FULL_PAYMENT_RULES,
  PAYMENT_OPTIONS,
} from '../../../constants/salon';
import { DAYS_OF_WEEK } from '../../../constants/time';
import { GALLERY_TYPES } from '../../../constants/gallery';
import { HTTP_STATUS } from '../../../constants/http';
import { SALON_STATES } from '../../../constants/salon';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  addGalleryBody,
  addServiceBody,
  closureBody,
  closureParams,
  closurePatchBody,
  editProfileBody,
  hoursBody,
  policyBody,
  previewClosureBody,
  previewHoursBody,
  serviceParams,
  servicesQuery,
  staffBody,
  staffParams,
  updateServiceBody,
  galleryItemParams,
  reasonBody,
  reorderGalleryBody,
  salonParams,
} from './salonEdit.validation';

const profile = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.enum(GENDERS),
  state: z.enum(SALON_STATES),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  profileUrl: z.string().nullable(),
  coverKey: z.string().nullable(),
  profileKey: z.string().nullable(),
  location: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
  locationText: z.string().nullable(),
  cityId: z.string().nullable(),
  areaId: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  completeness: z.object({ missing: z.array(z.string()), isComplete: z.boolean() }),
  rating: z.object({ avg: z.number(), count: z.number() }),
});
const item = z.object({
  id: z.string(),
  type: z.enum(GALLERY_TYPES),
  url: z.string(),
  thumbnailUrl: z.string().nullable(),
  durationSec: z.number().nullable(),
  order: z.number(),
});
const closure = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  reason: z.string().describe('Why the salon is closed (shown to customers).'),
  editable: z.boolean().describe('Only closures that start after today can be changed or removed.'),
});
const hoursView = z.object({
  weeklySchedule: z.array(
    z.object({
      day: z.enum(DAYS_OF_WEEK),
      isOff: z.boolean(),
      open: z.string(),
      close: z.string(),
    }),
  ),
  closures: z.array(closure),
  today: z.object({
    date: z.string(),
    isClosed: z.boolean(),
    closedReason: z.string().nullable(),
    open: z.string().nullable(),
    close: z.string().nullable(),
    isOpenNow: z.boolean(),
  }),
});
const conflict = z.object({
  bookingId: z.string(),
  startsAt: z.iso.datetime(),
  status: z.string(),
});
const serviceView = z.object({
  id: z.string(),
  catalogServiceId: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  price: z.string().describe('JOD decimal string, 3 decimals, tax inclusive.'),
  durationMinutes: z.number(),
  brideOnly: z.boolean(),
  extraDescription: z.string().nullable(),
  mediaUrls: z.array(z.string()),
  active: z.boolean(),
});
const staffView = z.object({
  memberId: z.string(),
  providesServices: z.boolean(),
  bio: z.string().nullable(),
  yearsOfExperience: z.number().nullable(),
  serviceIds: z.array(z.string()),
  brideQualified: z.boolean(),
  workingDays: z.array(
    z.object({
      day: z.enum(DAYS_OF_WEEK),
      start: z.string().nullable(),
      end: z.string().nullable(),
    }),
  ),
  rating: z.object({ avg: z.number(), count: z.number() }),
  customersCount: z.number(),
});
const policyView = z.object({
  cancellationWindowHours: z.number(),
  paymentOptions: z.array(z.enum(PAYMENT_OPTIONS)),
  depositPercentage: z.number().nullable(),
  depositRefundableOnCustomerCancel: z.boolean(),
  fullPaymentRefundOnCustomerCancel: z.enum(FULL_PAYMENT_REFUND_RULES),
  noShowDeposit: z.enum(NO_SHOW_DEPOSIT_RULES),
  noShowFullPayment: z.enum(NO_SHOW_FULL_PAYMENT_RULES),
  notes: z.string().nullable(),
});
const body = (
  schema: z.ZodType,
): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
  required: true,
  content: { [JSON_CONTENT_TYPE]: { schema } },
});

export const registerAdminSalonEditDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_SALON_EDIT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin salon editing'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const note =
    'Every write needs a `reason`, is audited, and tells the salon owner what area was changed. Images must be files the admin uploaded with the admin presign (same purposes as the merchant app).';
  const path = (route: string): string => `${base}${route.replace(/:(\w+)/g, '{$1}')}`;

  registry.registerPath({
    method: 'get',
    path: path(ADMIN_SALON_EDIT_ROUTES.profile),
    tags,
    summary: 'A salon’s editable profile',
    request: { headers, params: salonParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Profile', successResponseSchema(profile)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'patch',
    path: path(ADMIN_SALON_EDIT_ROUTES.profile),
    tags,
    summary: 'Edit a salon’s profile, location and contacts',
    description: `Send only what changed (\`null\` clears an optional field), plus \`reason\`. ${note}`,
    request: { headers, params: salonParams, body: body(editProfileBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Profile', successResponseSchema(profile)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_SALON_EDIT_ROUTES.gallery),
    tags,
    summary: 'A salon’s gallery',
    request: { headers, params: salonParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Items', successResponseSchema(z.array(item))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_SALON_EDIT_ROUTES.gallery),
    tags,
    summary: 'Add an uploaded image or video to a salon’s gallery (appended last)',
    description: note,
    request: { headers, params: salonParams, body: body(addGalleryBody) },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Added', successResponseSchema(item)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'put',
    path: path(ADMIN_SALON_EDIT_ROUTES.galleryOrder),
    tags,
    summary: 'Reorder a salon’s gallery: every item id exactly once',
    description: note,
    request: { headers, params: salonParams, body: body(reorderGalleryBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Items', successResponseSchema(z.array(item))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_SALON_EDIT_ROUTES.galleryRemove),
    tags,
    summary: 'Remove a gallery item and its files',
    description: note,
    request: { headers, params: galleryItemParams, body: body(reasonBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Removed', successResponseSchema(z.null())),
      ...failures,
    },
  });

  const ok = (label: string, schema: z.ZodType): ReturnType<typeof jsonResponse> =>
    jsonResponse(label, successResponseSchema(schema));
  const conflictNote =
    ' When existing PENDING/APPROVED bookings would be broken the change is refused with 409 `SCHEDULE_CONFLICT` and the booking ids in `details`; use the matching preview first.';

  registry.registerPath({
    method: 'get',
    path: path(ADMIN_SALON_EDIT_ROUTES.hours),
    tags,
    summary: 'Weekly hours, upcoming closures and today’s state',
    request: { headers, params: salonParams },
    responses: { [HTTP_STATUS.ok]: ok('Hours', hoursView), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_SALON_EDIT_ROUTES.hoursPreview),
    tags,
    summary: 'Preview: bookings a new weekly schedule would break (nothing is changed)',
    request: { headers, params: salonParams, body: body(previewHoursBody) },
    responses: { [HTTP_STATUS.ok]: ok('Affected bookings', z.array(conflict)), ...failures },
  });
  registry.registerPath({
    method: 'put',
    path: path(ADMIN_SALON_EDIT_ROUTES.hours),
    tags,
    summary: 'Replace the weekly working hours',
    description: `All seven days, each once. ${note}${conflictNote}`,
    request: { headers, params: salonParams, body: body(hoursBody) },
    responses: { [HTTP_STATUS.ok]: ok('Hours', hoursView), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_SALON_EDIT_ROUTES.closuresPreview),
    tags,
    summary: 'Preview: bookings a closure would break (nothing is changed)',
    request: { headers, params: salonParams, body: body(previewClosureBody) },
    responses: { [HTTP_STATUS.ok]: ok('Affected bookings', z.array(conflict)), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_SALON_EDIT_ROUTES.closures),
    tags,
    summary: 'Add a closure',
    description: `\`closureReason\` is the text customers see, \`reason\` the admin’s audit reason. ${note}${conflictNote}`,
    request: { headers, params: salonParams, body: body(closureBody) },
    responses: { [HTTP_STATUS.created]: ok('Added', closure), ...failures },
  });
  registry.registerPath({
    method: 'patch',
    path: path(ADMIN_SALON_EDIT_ROUTES.closure),
    tags,
    summary: 'Change a closure that has not started',
    description: `${note}${conflictNote} A closure that has started is history (422 \`INVALID_TRANSITION\`).`,
    request: { headers, params: closureParams, body: body(closurePatchBody) },
    responses: { [HTTP_STATUS.ok]: ok('Changed', closure), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_SALON_EDIT_ROUTES.closureRemove),
    tags,
    summary: 'Remove a closure that has not started',
    description: note,
    request: { headers, params: closureParams, body: body(reasonBody) },
    responses: { [HTTP_STATUS.ok]: ok('Removed', z.null()), ...failures },
  });
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_SALON_EDIT_ROUTES.services),
    tags,
    summary: 'A salon’s services, paginated',
    request: { headers, params: salonParams, query: servicesQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Services',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(serviceView),
          meta: paginationMetaSchema,
        }),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_SALON_EDIT_ROUTES.services),
    tags,
    summary: 'Add a catalog service to the salon',
    description: `Same rules as the merchant app (catalog audience must match the salon, one entry per catalog service, price above zero). ${note}`,
    request: { headers, params: salonParams, body: body(addServiceBody) },
    responses: { [HTTP_STATUS.created]: ok('Added', serviceView), ...failures },
  });
  registry.registerPath({
    method: 'patch',
    path: path(ADMIN_SALON_EDIT_ROUTES.service),
    tags,
    summary: 'Change a salon service (price, duration, bride-only, media, active)',
    description: note,
    request: { headers, params: serviceParams, body: body(updateServiceBody) },
    responses: { [HTTP_STATUS.ok]: ok('Changed', serviceView), ...failures },
  });
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_SALON_EDIT_ROUTES.staff),
    tags,
    summary: 'A member’s staff profile',
    request: { headers, params: staffParams },
    responses: { [HTTP_STATUS.ok]: ok('Staff profile', staffView), ...failures },
  });
  registry.registerPath({
    method: 'put',
    path: path(ADMIN_SALON_EDIT_ROUTES.staff),
    tags,
    summary: 'Replace a member’s staff profile (services, bride qualification, working days)',
    description: `${note}${conflictNote}`,
    request: { headers, params: staffParams, body: body(staffBody) },
    responses: { [HTTP_STATUS.ok]: ok('Staff profile', staffView), ...failures },
  });
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_SALON_EDIT_ROUTES.policy),
    tags,
    summary: 'A salon’s booking policy (null until one is set)',
    request: { headers, params: salonParams },
    responses: { [HTTP_STATUS.ok]: ok('Policy', policyView.nullable()), ...failures },
  });
  registry.registerPath({
    method: 'put',
    path: path(ADMIN_SALON_EDIT_ROUTES.policy),
    tags,
    summary: 'Replace a salon’s booking policy',
    description: `The whole policy at once; \`depositPercentage\` is required when a deposit is offered. ${note}`,
    request: { headers, params: salonParams, body: body(policyBody) },
    responses: { [HTTP_STATUS.ok]: ok('Policy', policyView), ...failures },
  });
};
