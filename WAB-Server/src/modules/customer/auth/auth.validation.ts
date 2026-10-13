import { z } from 'zod';
import { PHONE_CHECK_PURPOSES } from '../../../constants/customerAuth';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { GENDERS } from '../../../constants/enums';
import {
  EMAIL_MAX_LENGTH,
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
} from '../../../constants/identity';
import { EMAIL_PATTERN } from '../../../constants/providers';
import {
  idTokenSchema as idToken,
  installationSchema as installation,
  phoneSchema as phone,
  refreshTokenSchema as refreshToken,
} from '../../shared/auth/auth.schemas';

const name = z.string().trim().min(PERSON_NAME_MIN_LENGTH).max(PERSON_NAME_MAX_LENGTH);
const objectId = z.string().regex(OBJECT_ID_PATTERN);

export const checkPhoneSchema = z.object({ phone, purpose: z.enum(PHONE_CHECK_PURPOSES) });
export const loginSchema = z.object({ phone, idToken, installation });
export const registerSchema = z.object({
  firstName: name,
  lastName: name,
  email: z.string().trim().max(EMAIL_MAX_LENGTH).regex(EMAIL_PATTERN),
  gender: z.enum(GENDERS),
  cityId: objectId,
  areaId: objectId,
  phone,
  idToken,
  installation,
});
export const refreshSchema = z.object({ refreshToken });
export const changePhoneSchema = z.object({ phone, idToken });
