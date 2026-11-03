import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { E164_PATTERN } from '../../../constants/providers';
import {
  LATITUDE_LIMIT,
  LOCATION_TEXT_MAX_LENGTH,
  LONGITUDE_LIMIT,
  SALON_DESCRIPTION_MAX_LENGTH,
  SALON_NAME_MAX_LENGTH,
  SALON_NAME_MIN_LENGTH,
  STORAGE_KEY_MAX_LENGTH,
  FILE_REF_PATTERN,
} from '../../../constants/salon';

const key = z.string().max(STORAGE_KEY_MAX_LENGTH).regex(FILE_REF_PATTERN);
const objectId = z.string().regex(OBJECT_ID_PATTERN);

/** Profile edit (M13): send only what changed; `null` clears an optional field. */
export const profilePatchSchema = z
  .object({
    name: z.string().trim().min(SALON_NAME_MIN_LENGTH).max(SALON_NAME_MAX_LENGTH),
    description: z.string().trim().max(SALON_DESCRIPTION_MAX_LENGTH).nullable(),
    coverKey: key.nullable(),
    profileKey: key.nullable(),
    location: z
      .object({
        latitude: z.number().min(-LATITUDE_LIMIT).max(LATITUDE_LIMIT),
        longitude: z.number().min(-LONGITUDE_LIMIT).max(LONGITUDE_LIMIT),
      })
      .nullable(),
    locationText: z.string().trim().max(LOCATION_TEXT_MAX_LENGTH).nullable(),
    cityId: objectId,
    areaId: objectId,
    phone: z.string().regex(E164_PATTERN),
    whatsapp: z.string().regex(E164_PATTERN).nullable(),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'at least one field to change',
  });
