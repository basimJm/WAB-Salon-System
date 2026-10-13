import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { HOME_ROUTES } from '../../../constants/home';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { homeQuerySchema } from './home.validation';

const card = z.object({
  id: z.string(),
  name: z.string(),
  profileImageUrl: z.string().nullable(),
  rating: z.number(),
  reviewsCount: z.number(),
  locationText: z.string().nullable(),
  shortDescription: z.string().nullable(),
  isOpenNow: z.boolean(),
  todayHours: z.object({ open: z.string(), close: z.string() }).nullable(),
  isFavorite: z.boolean(),
  distanceKm: z.number().nullable(),
});
const section = (item: z.ZodType): z.ZodType =>
  z.object({ items: z.array(item), hasMore: z.boolean() });

export const registerCustomerHomeDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES.customer}${HOME_ROUTES.base}`,
    tags: ['Home'],
    summary: 'Home (S03): banners, services, recommended and nearest salons in one request',
    description:
      'Public; a valid customer token adds `firstName`, `unreadCount` and `isFavorite`. `nearest` is null unless `lat` and `lng` are sent. Each section holds 10 items; `hasMore` shows See more / See all.',
    security: [],
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      query: homeQuerySchema,
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Home',
        successResponseSchema(
          z.object({
            firstName: z.string().nullable(),
            unreadCount: z.number().nullable(),
            banners: z.array(
              z.object({
                id: z.string(),
                imageUrl: z.string(),
                actionType: z.string(),
                actionValue: z.string().nullable().optional(),
              }),
            ),
            services: section(
              z.object({
                id: z.string(),
                name: z.string(),
                description: z.string(),
                imageUrl: z.string(),
                gender: z.enum(['MALE', 'FEMALE']),
              }),
            ),
            recommended: section(card),
            nearest: section(card).nullable(),
          }),
        ),
      ),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};
