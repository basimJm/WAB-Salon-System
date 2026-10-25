import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { REVIEW_ROUTES } from '../../../constants/reviews';
import { SALON_DETAILS_ROUTES } from '../../../constants/salonDetails';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  reviewListQuerySchema,
  salonReviewParamsSchema,
  staffReviewParamsSchema,
  submitReviewBodySchema,
} from './reviews.validation';

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

export const registerCustomerReviewDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.customer}${SALON_DETAILS_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const listResponse = jsonResponse(
    'Approved reviews, newest first, with the target rating summary',
    z.object({
      success: z.literal(true),
      message: z.string(),
      data: z.object({
        items: z.array(reviewView),
        summary: z.object({ avg: z.number(), count: z.number() }),
      }),
      meta: paginationMetaSchema,
    }),
  );
  const created = jsonResponse(
    'Review received; it appears after admin approval',
    z.object({
      success: z.literal(true),
      message: z.string(),
      data: z.object({ id: z.string(), status: z.literal('PENDING') }),
    }),
  );
  const salonPath = `${base}${REVIEW_ROUTES.salon.replace(':salonId', '{salonId}')}`;
  const staffPath = `${base}${REVIEW_ROUTES.staff
    .replace(':salonId', '{salonId}')
    .replace(':memberId', '{memberId}')}`;
  registry.registerPath({
    method: 'get',
    path: salonPath,
    tags: ['Reviews'],
    summary: 'Salon reviews (S08)',
    security: [],
    request: { headers, params: salonReviewParamsSchema, query: reviewListQuerySchema },
    responses: { [HTTP_STATUS.ok]: listResponse, ...failures },
  });
  registry.registerPath({
    method: 'get',
    path: staffPath,
    tags: ['Reviews'],
    summary: 'Staff reviews (S09)',
    security: [],
    request: { headers, params: staffReviewParamsSchema, query: reviewListQuerySchema },
    responses: { [HTTP_STATUS.ok]: listResponse, ...failures },
  });
  const body = { content: { 'application/json': { schema: submitReviewBodySchema } } };
  registry.registerPath({
    method: 'post',
    path: salonPath,
    tags: ['Reviews'],
    summary:
      'Review a salon (rating 1-5, optional comment). Any active customer; no booking needed. Waits for approval; 429 when too many pending reviews exist for this salon.',
    request: { headers, params: salonReviewParamsSchema, body },
    responses: { [HTTP_STATUS.created]: created, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: staffPath,
    tags: ['Reviews'],
    summary: 'Review a staff member (independent of the salon rating)',
    request: { headers, params: staffReviewParamsSchema, body },
    responses: { [HTTP_STATUS.created]: created, ...failures },
  });
};
