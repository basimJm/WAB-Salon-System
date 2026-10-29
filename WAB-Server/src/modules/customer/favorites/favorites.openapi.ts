import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { FAVORITE_ROUTES } from '../../../constants/favorites';
import { HTTP_STATUS } from '../../../constants/http';
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
import { favoriteParamsSchema, favoritesQuerySchema } from './favorites.validation';

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

export const registerCustomerFavoritesDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.customer}${FAVORITE_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const flag = successResponseSchema(z.object({ isFavorite: z.boolean() }));
  registry.registerPath({
    method: 'get',
    path: base,
    tags: ['Favorites'],
    summary: 'My favorite salons (S20), newest first',
    description: 'Salons that are no longer visible to customers are left out of the page.',
    request: { headers, query: favoritesQuerySchema },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Favorite salon cards',
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
    method: 'put',
    path: `${base}/{salonId}`,
    tags: ['Favorites'],
    summary: 'Save a salon (idempotent). Only LIVE, complete salons can be saved.',
    request: { headers, params: favoriteParamsSchema },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Saved', flag), ...failures },
  });
  registry.registerPath({
    method: 'delete',
    path: `${base}/{salonId}`,
    tags: ['Favorites'],
    summary: 'Remove a salon from favorites (idempotent)',
    request: { headers, params: favoriteParamsSchema },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Removed', flag), ...failures },
  });
};
