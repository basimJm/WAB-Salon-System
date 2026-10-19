import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_SALON_EDIT_ROUTES } from '../../../constants/adminSalonEdit';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { GENDERS } from '../../../constants/enums';
import { GALLERY_TYPES } from '../../../constants/gallery';
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
import {
  addGalleryBody,
  editProfileBody,
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
  const path = (route: string): string =>
    `${base}${route.replace(':id', '{id}').replace(':itemId', '{itemId}')}`;

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
};
