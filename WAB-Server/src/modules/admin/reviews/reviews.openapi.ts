import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { REVIEW_STATUSES, REVIEW_TARGETS } from '../../../constants/enums';
import { HTTP_STATUS } from '../../../constants/http';
import { ADMIN_REVIEW_ROUTES } from '../../../constants/reviews';
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
  adminReviewsQuery,
  bulkBody,
  optionalReasonBody,
  removeBody,
  reviewIdParams,
} from './reviews.validation';

const row = z.object({
  id: z.string(),
  target: z.enum(REVIEW_TARGETS),
  status: z.enum(REVIEW_STATUSES),
  rating: z.number(),
  comment: z.string().nullable(),
  salon: z.object({ id: z.string(), name: z.string() }),
  staff: z.object({ id: z.string(), firstName: z.string() }).nullable(),
  author: z.object({ id: z.string(), firstName: z.string(), lastName: z.string() }),
  authorOtherReviews: z.number(),
  createdAt: z.string(),
  moderation: z
    .object({ by: z.string(), at: z.string(), reason: z.string().nullable() })
    .nullable(),
});

export const registerAdminReviewDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_REVIEW_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin reviews'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const json = (schema: z.ZodType): { content: { 'application/json': { schema: z.ZodType } } } => ({
    content: { 'application/json': { schema } },
  });
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary:
      'Reviews by status (pending by default, oldest first; other statuses newest first), filter by target, salon, staff, rating',
    request: { headers, query: adminReviewsQuery },
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
  for (const [path, summary, body] of [
    [
      'approve',
      'Publish a pending review; the salon or staff rating is recomputed',
      optionalReasonBody,
    ],
    ['reject', 'Reject a pending review (reason optional)', optionalReasonBody],
    ['remove', 'Take a published review down (reason required); rating recomputed', removeBody],
  ] as const) {
    registry.registerPath({
      method: 'post',
      path: `${base}/{id}/${path}`,
      tags,
      summary,
      description: 'A review that was already decided answers 422 `ALREADY_HANDLED`. Audited.',
      request: { headers, params: reviewIdParams, body: json(body) },
      responses: {
        [HTTP_STATUS.ok]: jsonResponse('Review', successResponseSchema(row)),
        ...failures,
      },
    });
  }
  registry.registerPath({
    method: 'post',
    path: `${base}/bulk`,
    tags,
    summary: 'Approve or reject up to 100 pending reviews; each one is reported separately',
    request: { headers, body: json(bulkBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Result per review',
        successResponseSchema(
          z.array(z.object({ id: z.string(), ok: z.boolean(), code: z.string().optional() })),
        ),
      ),
      ...failures,
    },
  });
};
