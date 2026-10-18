import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import { STORAGE_KEY_MAX_LENGTH, STORAGE_KEY_PATTERN } from '../../../constants/salon';
import {
  SERVICE_DURATION_MAX,
  SERVICE_DURATION_MIN,
  SERVICE_DURATION_STEP_MIN,
  SERVICE_EXTRA_DESCRIPTION_MAX_LENGTH,
  SERVICE_MEDIA_MAX_ITEMS,
} from '../../../constants/salonServices';
import { isJodString, parseJod } from '../../../utils/money';
import { paginationQuery } from '../../../utils/pagination';

/** `"12.500"` on the wire, integer fils inside; must be above zero. */
const price = z
  .string()
  .refine((v) => isJodString(v))
  .transform((v) => parseJod(v))
  .refine((fils) => fils > 0);
const duration = z
  .number()
  .int()
  .min(SERVICE_DURATION_MIN)
  .max(SERVICE_DURATION_MAX)
  .refine((v) => v % SERVICE_DURATION_STEP_MIN === 0);
const mediaKey = z.string().max(STORAGE_KEY_MAX_LENGTH).regex(STORAGE_KEY_PATTERN);
const media = z
  .array(mediaKey)
  .max(SERVICE_MEDIA_MAX_ITEMS)
  .refine((keys) => new Set(keys).size === keys.length);
const description = z.string().trim().max(SERVICE_EXTRA_DESCRIPTION_MAX_LENGTH);

export const servicesQuery = paginationQuery(APP_PAGE_SIZE);
export const addServiceSchema = z.object({
  catalogServiceId: z.string().regex(OBJECT_ID_PATTERN),
  price,
  durationMinutes: duration,
  brideOnly: z.boolean().optional(),
  extraDescription: description.optional(),
  mediaKeys: media.optional(),
  active: z.boolean().optional(),
});
export const updateServiceSchema = z
  .object({
    price,
    durationMinutes: duration,
    brideOnly: z.boolean(),
    extraDescription: description.nullable(),
    mediaKeys: media,
    active: z.boolean(),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'at least one field to change',
  });
export const serviceParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
