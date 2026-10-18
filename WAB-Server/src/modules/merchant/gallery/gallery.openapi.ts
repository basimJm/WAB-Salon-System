import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { GALLERY_TYPES, MERCHANT_GALLERY_ROUTES } from '../../../constants/gallery';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { addGallerySchema, galleryParams, reorderSchema } from './gallery.validation';

const item = z.object({
  id: z.string(),
  type: z.enum(GALLERY_TYPES),
  url: z.string(),
  thumbnailUrl: z
    .string()
    .nullable()
    .describe('May not exist right after upload: fall back to url.'),
  durationSec: z.number().nullable(),
  order: z.number(),
});

export const registerMerchantGalleryDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.merchant}${MERCHANT_GALLERY_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Salon gallery'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const body = (
    schema: z.ZodType,
  ): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
    required: true,
    content: { 'application/json': { schema } },
  });
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'Gallery in display order (GALLERY_MANAGE)',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Items', successResponseSchema(z.array(item))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: base,
    tags,
    summary: 'Add a confirmed upload to the gallery (appended last)',
    request: { headers, body: body(addGallerySchema) },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Added', successResponseSchema(item)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'put',
    path: `${base}${MERCHANT_GALLERY_ROUTES.order}`,
    tags,
    summary: 'Reorder: send every item id exactly once in the new order',
    request: { headers, body: body(reorderSchema) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Items', successResponseSchema(z.array(item))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'delete',
    path: `${base}/{id}`,
    tags,
    summary: 'Delete an item and its files',
    request: { headers, params: galleryParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Deleted', successResponseSchema(z.null())),
      ...failures,
    },
  });
};
