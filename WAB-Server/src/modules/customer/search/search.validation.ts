import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { BUSINESS_TYPES, GENDERS } from '../../../constants/enums';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import {
  LATITUDE_LIMIT,
  LONGITUDE_LIMIT,
  SEARCH_GENERAL_FILTERS,
  SEARCH_SORTS,
  SEARCH_MAX_SERVICE_FILTERS,
  SEARCH_RATING_MAX,
  SEARCH_RATING_MIN,
  SEARCH_TEXT_MAX_LENGTH,
} from '../../../constants/search';
import { isJodString, parseJod } from '../../../utils/money';
import { paginationQuery } from '../../../utils/pagination';

/** `?serviceIds=a,b` or repeated `serviceIds=a&serviceIds=b`. */
const serviceIds = z
  .union([z.string(), z.array(z.string())])
  .transform((v) =>
    (Array.isArray(v) ? v : v.split(',')).map((id) => id.trim()).filter((id) => id !== ''),
  )
  .pipe(z.array(z.string().regex(OBJECT_ID_PATTERN)).max(SEARCH_MAX_SERVICE_FILTERS));
const jod = z
  .string()
  .refine((v) => isJodString(v))
  .transform((v) => parseJod(v));

export const searchQuerySchema = paginationQuery(APP_PAGE_SIZE)
  .extend({
    gender: z.enum(GENDERS),
    /** Only salons or only clinics (§5.19); omitted = both. */
    businessType: z.enum(BUSINESS_TYPES).optional(),
    q: z.string().trim().max(SEARCH_TEXT_MAX_LENGTH).optional(),
    serviceIds: serviceIds.optional(),
    /** JOD decimal strings: the range of the SUM of the selected services' prices. */
    minPrice: jod.optional(),
    maxPrice: jod.optional(),
    minRating: z.coerce.number().int().min(SEARCH_RATING_MIN).max(SEARCH_RATING_MAX).optional(),
    general: z.enum(SEARCH_GENERAL_FILTERS).optional(),
    lat: z.coerce.number().min(-LATITUDE_LIMIT).max(LATITUDE_LIMIT).optional(),
    lng: z.coerce.number().min(-LONGITUDE_LIMIT).max(LONGITUDE_LIMIT).optional(),
    sort: z.enum(SEARCH_SORTS).optional(),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    path: ['lat'],
    message: 'lat and lng go together',
  })
  .refine((q) => q.sort !== 'NEAREST' || q.lat !== undefined, {
    path: ['sort'],
    message: 'NEAREST needs lat and lng',
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    path: ['maxPrice'],
    message: 'maxPrice must not be below minPrice',
  })
  .refine(
    (q) =>
      (q.minPrice === undefined && q.maxPrice === undefined) || (q.serviceIds?.length ?? 0) > 0,
    {
      path: ['serviceIds'],
      message: 'a price range needs selected services',
    },
  );

export const filtersQuerySchema = z.object({
  gender: z.enum(GENDERS),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  serviceIds: serviceIds.pipe(z.array(z.string()).min(1)),
});
