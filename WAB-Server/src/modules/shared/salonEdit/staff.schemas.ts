import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { STAFF_BIO_MAX_LENGTH, STAFF_MAX_YEARS_OF_EXPERIENCE } from '../../../constants/identity';
import { DAYS_OF_WEEK } from '../../../constants/time';
import { isHHmm } from '../../../utils/time';

const hhmm = z.string().refine(isHHmm);

/** The whole staff profile at once (the app edits it as one form). */
export const staffProfileSchema = z.object({
  providesServices: z.boolean(),
  bio: z.string().trim().max(STAFF_BIO_MAX_LENGTH).optional(),
  yearsOfExperience: z.number().int().min(0).max(STAFF_MAX_YEARS_OF_EXPERIENCE).optional(),
  serviceIds: z.array(z.string().regex(OBJECT_ID_PATTERN)).max(200),
  brideQualified: z.boolean(),
  workingDays: z
    .array(z.object({ day: z.enum(DAYS_OF_WEEK), start: hhmm.optional(), end: hhmm.optional() }))
    .max(DAYS_OF_WEEK.length),
});
export const staffParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
