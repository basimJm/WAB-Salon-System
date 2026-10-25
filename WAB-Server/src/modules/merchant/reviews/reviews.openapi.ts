import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { MERCHANT_REVIEW_ROUTES } from '../../../constants/reviews';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { merchantReviewsQuery } from './reviews.validation';

const review = z.object({
  id: z.string().describe('Review reference (used by Report → Contact WAB)'),
  customerName: z.string().describe('First name only'),
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
  branch: z.object({ id: z.string(), name: z.string() }).nullable(),
  staff: z.object({ id: z.string(), firstName: z.string() }).nullable(),
});
const summary = z.object({
  avg: z.number().describe('One decimal'),
  count: z.number(),
  distribution: z.record(z.string(), z.number()).describe('Published reviews per star, "1"…"5"'),
});

export const registerMerchantReviewDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES.merchant}${MERCHANT_REVIEW_ROUTES.base}`,
    tags: ['Reviews'],
    summary:
      'Published reviews of the salon or one staff member with average, count and star distribution (REVIEWS_VIEW; branch members: their branch only, else 403 BRANCH_SCOPE_DENIED)',
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      query: merchantReviewsQuery,
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Published reviews, newest first, with the summary of the same scope',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.object({ items: z.array(review), summary }),
          meta: paginationMetaSchema,
        }),
      ),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.forbidden,
        HTTP_STATUS.notFound,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};
