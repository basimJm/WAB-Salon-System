import { z } from 'zod';
import { ID_TOKEN_MAX_LENGTH, PHONE_CHECK_PURPOSES } from '../../../constants/customerAuth';
import { GENDERS, PLATFORMS } from '../../../constants/enums';
import {
  APP_VERSION_MAX_LENGTH,
  DEVICE_TEXT_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  FCM_TOKEN_MAX_LENGTH,
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
  PHONE_NUMBER_PATTERN,
} from '../../../constants/identity';
import { REFRESH_TOKEN_PATTERN } from '../../../constants/auth';
import { INSTALLATION_ID_PATTERN, EMAIL_PATTERN } from '../../../constants/providers';
import { COUNTRY_CODE_PATTERN } from '../../../constants/referenceData';
import { OBJECT_ID_PATTERN } from '../../../constants/database';

const phone = z.object({
  countryCode: z.string().regex(COUNTRY_CODE_PATTERN),
  number: z.string().regex(PHONE_NUMBER_PATTERN),
});
const idToken = z.string().min(1).max(ID_TOKEN_MAX_LENGTH);
const refreshToken = z.string().regex(REFRESH_TOKEN_PATTERN);
const name = z.string().trim().min(PERSON_NAME_MIN_LENGTH).max(PERSON_NAME_MAX_LENGTH);
const objectId = z.string().regex(OBJECT_ID_PATTERN);

/** The app instance behind the request: push token holder and analytics identity link. */
const installation = z.object({
  installationId: z.string().regex(INSTALLATION_ID_PATTERN),
  platform: z.enum(PLATFORMS),
  appVersion: z.string().min(1).max(APP_VERSION_MAX_LENGTH),
  osVersion: z.string().min(1).max(DEVICE_TEXT_MAX_LENGTH).optional(),
  deviceModel: z.string().min(1).max(DEVICE_TEXT_MAX_LENGTH).optional(),
  fcmToken: z.string().min(1).max(FCM_TOKEN_MAX_LENGTH).optional(),
});

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
