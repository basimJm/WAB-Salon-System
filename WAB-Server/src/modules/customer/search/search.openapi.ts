import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { SEARCH_ROUTES } from '../../../constants/search';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
  successResponseSchema,
  businessKindShape,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { filtersQuerySchema, searchQuerySchema, suggestionsQuerySchema } from './search.validation';

const card = z.object({
  id: z.string(),
  name: z.string(),
  ...businessKindShape,
  profileImageUrl: z.string().nullable(),
  rating: z.number(),
  reviewsCount: z.number(),
  locationText: z.string().nullable(),
  shortDescription: z.string().nullable(),
  isOpenNow: z.boolean(),
  todayHours: z.object({ open: z.string(), close: z.string() }).nullable(),
  isFavorite: z.boolean(),
  distanceKm: z.number().nullable(),
  branchCount: z.number().describe('Bookable branches of the salon (§5.17).'),
  branch: z
    .object({ id: z.string(), name: z.string() })
    .nullable()
    .describe(
      'The branch the place, hours and distance come from: the nearest, else the main one.',
    ),
});

export const registerCustomerSearchDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.customer}${SEARCH_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path: base,
    tags: ['Salon search'],
    summary:
      'Search LIVE businesses of every type and audience (§5.22): type lens `businessType` (one or several), optional `gender` filter (businesses serving it: own audience or BOTH), name text, ALL selected services offered, price range (of their sum with services, else of any active service; JOD strings), minimum rating, recommended (each type in the admin order), `openNow` (any bookable branch open now in Asia/Amman, §5.3/§5.17)',
    description:
      'Public; a valid customer token only adds `isFavorite`. Combined filters are all applied (AND). Ordered by rating. Booking still applies the audience rule (§5.19).',
    security: [],
    request: { headers, query: searchQuerySchema },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Salons',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(card),
          meta: paginationMetaSchema,
        }),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${SEARCH_ROUTES.filters}`,
    tags: ['Salon search'],
    summary:
      'Price slider bounds: min/max of the sums of the selected services over matching businesses, or of every active service price when none is selected (§5.22)',
    security: [],
    request: { headers, query: filtersQuerySchema },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Bounds',
        successResponseSchema(
          z.object({ priceRange: z.object({ min: z.string(), max: z.string() }).nullable() }),
        ),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${SEARCH_ROUTES.suggestions}`,
    tags: ['Salon search'],
    summary:
      'Typed suggestions (§5.22): matching catalog services with the number of places offering them (most first), then matching places; both follow the lens and the gender filter',
    security: [],
    request: { headers, query: suggestionsQuerySchema },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Suggestions',
        successResponseSchema(
          z.object({
            services: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                businessType: businessKindShape.businessType,
                placesCount: z.number(),
              }),
            ),
            places: z.array(z.object({ id: z.string(), name: z.string(), ...businessKindShape })),
          }),
        ),
      ),
      ...failures,
    },
  });
};
