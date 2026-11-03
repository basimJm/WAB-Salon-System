import { z } from 'zod';
import { GENDERS } from '../../../constants/enums';
import { businessTypesParam } from '../search/search.validation';
import { LATITUDE_LIMIT, LONGITUDE_LIMIT } from '../../../constants/search';

export const homeQuerySchema = z
  .object({
    /** Banners only (§5.22): businesses are never filtered by gender. */
    gender: z.enum(GENDERS),
    /** Type lens (§5.22): `SALON,CLINIC,TATTOO` or one; omitted = every type. */
    businessType: businessTypesParam.optional(),
    lat: z.coerce.number().min(-LATITUDE_LIMIT).max(LATITUDE_LIMIT).optional(),
    lng: z.coerce.number().min(-LONGITUDE_LIMIT).max(LONGITUDE_LIMIT).optional(),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    path: ['lat'],
    message: 'lat and lng go together',
  });
