import { z } from 'zod';
import {
  BRANCH_LOCATION_TEXT_MAX_LENGTH,
  BRANCH_NAME_MAX_LENGTH,
  BRANCH_NAME_MIN_LENGTH,
  BRANCH_OFFLINE_REASON_MAX_LENGTH,
} from '../../../constants/branches';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { E164_PATTERN } from '../../../constants/providers';
import { LATITUDE_LIMIT, LONGITUDE_LIMIT } from '../../../constants/salon';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
const nameText = z.string().trim().min(BRANCH_NAME_MIN_LENGTH).max(BRANCH_NAME_MAX_LENGTH);
const location = z.object({
  latitude: z.number().min(-LATITUDE_LIMIT).max(LATITUDE_LIMIT),
  longitude: z.number().min(-LONGITUDE_LIMIT).max(LONGITUDE_LIMIT),
});
const phone = z.string().regex(E164_PATTERN);

/** A new branch (§3.3a): name in both languages, a pin, address, city/area and a phone. */
export const createBranchSchema = z.object({
  name: z.object({ ar: nameText, en: nameText }),
  location,
  locationText: z.string().trim().min(1).max(BRANCH_LOCATION_TEXT_MAX_LENGTH),
  cityId: objectId,
  areaId: objectId,
  phone,
  whatsapp: phone.optional(),
});

/** Edit: send only what changed; `whatsapp: null` clears it. */
export const updateBranchSchema = createBranchSchema
  .extend({ whatsapp: phone.nullable() })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'at least one field to change',
  });

export const branchParams = z.object({ branchId: objectId });
export const branchReasonSchema = z.object({
  reason: z.string().trim().min(1).max(BRANCH_OFFLINE_REASON_MAX_LENGTH),
});
