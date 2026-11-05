import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { BUSINESS_TYPES, GENDERS } from '../../../constants/enums';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import {
  LATITUDE_LIMIT,
  LONGITUDE_LIMIT,
  SEARCH_GENERAL_FILTERS,
  SEARCH_SORTS,
  SEARCH_MAX_BUSINESS_TYPES,
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
/** Type lens (§5.22): `?businessType=SALON,TATTOO` or repeated; one value still works. */
export const businessTypesParam = z
  .union([z.string(), z.array(z.string())])
  .transform((v) =>
    (Array.isArray(v) ? v : v.split(',')).map((t) => t.trim()).filter((t) => t !== ''),
  )
  .pipe(z.array(z.enum(BUSINESS_TYPES)).max(SEARCH_MAX_BUSINESS_TYPES));
const jod = z
  .string()
  .refine((v) => isJodString(v))
  .transform((v) => parseJod(v));
const flag = z.enum(['true', 'false']).transform((v) => v === 'true');

export const searchQuerySchema = paginationQuery(APP_PAGE_SIZE)
  .extend({
    /** Search filter (§5.22): businesses serving this gender (own or BOTH); omitted = all. */
    gender: z.enum(GENDERS).optional(),
    /** Type lens (§5.22): one or several types; omitted = every type. */
    businessType: businessTypesParam.optional(),
    q: z.string().trim().max(SEARCH_TEXT_MAX_LENGTH).optional(),
    serviceIds: serviceIds.optional(),
    /**
     * JOD decimal strings. With `serviceIds`: range of the SUM of their prices; without: at least
     * one active service priced inside the range (§5.22).
     */
    minPrice: jod.optional(),
    maxPrice: jod.optional(),
    minRating: z.coerce.number().int().min(SEARCH_RATING_MIN).max(SEARCH_RATING_MAX).optional(),
    general: z.enum(SEARCH_GENERAL_FILTERS).optional(),
    lat: z.coerce.number().min(-LATITUDE_LIMIT).max(LATITUDE_LIMIT).optional(),
    lng: z.coerce.number().min(-LONGITUDE_LIMIT).max(LONGITUDE_LIMIT).optional(),
    sort: z.enum(SEARCH_SORTS).optional(),
    /**
     * "Open now" chip (§5.17, with `isOpenNow` from §5.3): the business has at least one
     * bookable branch open now in Asia/Amman. Omitted or `false`: no filter.
     */
    openNow: flag.optional(),
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
  });

export const filtersQuerySchema = z.object({
  gender: z.enum(GENDERS).optional(),
  businessType: businessTypesParam.optional(),
  /** Omitted: the price range of every active service of the matching businesses (§5.22). */
  serviceIds: serviceIds.optional(),
});

/** Typed suggestions (§5.22). */
export const suggestionsQuerySchema = z.object({
  q: z.string().trim().min(1).max(SEARCH_TEXT_MAX_LENGTH),
  gender: z.enum(GENDERS).optional(),
  businessType: businessTypesParam.optional(),
});
