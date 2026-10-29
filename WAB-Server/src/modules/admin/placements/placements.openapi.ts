import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { AUDIENCES, BUSINESS_TYPES } from '../../../constants/enums';
import { HTTP_STATUS } from '../../../constants/http';
import { ADMIN_PLACEMENT_ROUTES, PLACEMENT_STATUSES } from '../../../constants/placements';
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
  createPlacementBody,
  endPlacementBody,
  placementParams,
  placementsQuery,
  reorderBody,
  updatePlacementBody,
} from './placements.validation';

const row = z.object({
  id: z.string(),
  salon: z.object({ id: z.string(), name: z.string() }),
  businessType: z.enum(BUSINESS_TYPES),
  audience: z.enum(AUDIENCES),
  startAt: z.string(),
  endAt: z.string(),
  order: z.number(),
  amountPaid: z.string().describe('JOD, 3 decimals'),
  note: z.string().nullable(),
  status: z.enum(PLACEMENT_STATUSES),
});

export const registerAdminPlacementDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_PLACEMENT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin recommended salons'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const json = (schema: z.ZodType): { content: { 'application/json': { schema: z.ZodType } } } => ({
    content: { 'application/json': { schema } },
  });
  const one = { [HTTP_STATUS.ok]: jsonResponse('Placement', successResponseSchema(row)) };
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'Placements per audience in display order, with scheduled / active / ended status',
    request: { headers, query: placementsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Page',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(row),
          meta: paginationMetaSchema,
        }),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: base,
    tags,
    summary:
      'Add a placement. Business type and audience are copied from the salon (Recommended salons / Recommended clinics); a salon cannot have overlapping placements (409).',
    request: { headers, body: json(createPlacementBody) },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Created', successResponseSchema(row)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'patch',
    path: `${base}/{id}`,
    tags,
    summary: 'Edit a scheduled or running placement (an ended one is 422)',
    request: { headers, params: placementParams, body: json(updatePlacementBody) },
    responses: { ...one, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}/{id}/end`,
    tags,
    summary: 'Stop a placement now (remove from the customer app)',
    request: { headers, params: placementParams, body: json(endPlacementBody) },
    responses: { ...one, ...failures },
  });
  registry.registerPath({
    method: 'put',
    path: `${base}/reorder`,
    tags,
    summary: 'Set the display order of one audience’s placements (drag to reorder)',
    request: { headers, body: json(reorderBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Reordered', successResponseSchema(z.array(row))),
      ...failures,
    },
  });
};
