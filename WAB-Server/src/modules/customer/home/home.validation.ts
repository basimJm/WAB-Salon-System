import { z } from 'zod';
import { GENDERS } from '../../../constants/enums';
import { LATITUDE_LIMIT, LONGITUDE_LIMIT } from '../../../constants/search';

export const homeQuerySchema = z
  .object({
    gender: z.enum(GENDERS),
    lat: z.coerce.number().min(-LATITUDE_LIMIT).max(LATITUDE_LIMIT).optional(),
    lng: z.coerce.number().min(-LONGITUDE_LIMIT).max(LONGITUDE_LIMIT).optional(),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    path: ['lat'],
    message: 'lat and lng go together',
  });
