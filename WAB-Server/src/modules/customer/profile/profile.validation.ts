import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { GENDERS, LANGUAGES } from '../../../constants/enums';
import {
  EMAIL_MAX_LENGTH,
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
} from '../../../constants/identity';
import { EMAIL_PATTERN } from '../../../constants/providers';

const name = z.string().trim().min(PERSON_NAME_MIN_LENGTH).max(PERSON_NAME_MAX_LENGTH);
const objectId = z.string().regex(OBJECT_ID_PATTERN);

export const updateProfileBody = z.object({
  firstName: name.optional(),
  lastName: name.optional(),
  email: z.string().trim().max(EMAIL_MAX_LENGTH).regex(EMAIL_PATTERN).optional(),
  gender: z.enum(GENDERS).optional(),
  cityId: objectId.optional(),
  areaId: objectId.optional(),
  language: z.enum(LANGUAGES).optional(),
});
/** `key` comes from a presigned upload of purpose CUSTOMER_AVATAR. */
export const avatarBody = z.object({ key: z.string().trim().min(1).max(1024) });
