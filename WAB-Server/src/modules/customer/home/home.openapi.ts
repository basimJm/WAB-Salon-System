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
import { businessKindShape } from '../../../docs/schemas';
import { homeQuerySchema } from './home.validation';

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
const section = (item: z.ZodType): z.ZodType =>
  z.object({ items: z.array(item), hasMore: z.boolean() });

const serviceSection = section(
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    imageUrl: z.string(),
    ...businessKindShape,
  }),
);
const nearestSection = section(
  card.extend({
    title: z
      .string()
      .describe('"Salon - Branch" for a salon with several branches, else the salon name.'),
  }),
);

export const registerCustomerHomeDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES.customer}${HOME_ROUTES.base}`,
    tags: ['Home'],
    summary:
      'Home (S03, §5.22): banners, Explore, Near you, Recommended, Book again across the type lens (`businessType`), in one request',
    description:
      "Public; a valid customer token adds `firstName`, `unreadCount`, `isFavorite` and `bookAgain`. Businesses are never filtered by gender (§5.22; `gender` selects banners only). `explore` = most-booked catalog services of the lens types; `nearYou` = one list of bookable branches by distance (null without `lat`/`lng`); `recommendedAll` = one rail of the lens types' active placements; `bookAgain` = businesses of the customer's completed bookings with that booking's services (null for guests). The per-type keys stay for app versions before CUS-102. Each section holds 10 items; `hasMore` shows See more / See all.",
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
            explore: serviceSection,
            nearYou: nearestSection.nullable(),
            recommendedAll: section(card),
            bookAgain: section(
              card.extend({
                lastBooking: z.object({ id: z.string(), salonServiceIds: z.array(z.string()) }),
              }),
            ).nullable(),
            salonServices: serviceSection,
            clinicServices: serviceSection,
            recommendedSalons: section(card),
            recommendedClinics: section(card),
            nearestSalons: nearestSection.nullable(),
            nearestClinics: nearestSection.nullable(),
            services: serviceSection.describe('Deprecated: same as salonServices.'),
            recommended: section(card).describe('Deprecated: same as recommendedSalons.'),
            nearest: nearestSection.nullable().describe('Deprecated: same as nearestSalons.'),
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
