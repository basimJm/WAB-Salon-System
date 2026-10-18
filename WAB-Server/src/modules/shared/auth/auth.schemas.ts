import { z } from 'zod';
import { REFRESH_TOKEN_PATTERN } from '../../../constants/auth';
import { ID_TOKEN_MAX_LENGTH } from '../../../constants/customerAuth';
import {
  APP_VERSION_MAX_LENGTH,
  DEVICE_TEXT_MAX_LENGTH,
  FCM_TOKEN_MAX_LENGTH,
  PHONE_NUMBER_PATTERN,
} from '../../../constants/identity';
import { PLATFORMS } from '../../../constants/enums';
import { INSTALLATION_ID_PATTERN } from '../../../constants/providers';
import { COUNTRY_CODE_PATTERN } from '../../../constants/referenceData';

/** Request pieces shared by the customer and merchant sign-in routes. */
export const phoneSchema = z.object({
  countryCode: z.string().regex(COUNTRY_CODE_PATTERN),
  number: z.string().regex(PHONE_NUMBER_PATTERN),
});
export const idTokenSchema = z.string().min(1).max(ID_TOKEN_MAX_LENGTH);
export const refreshTokenSchema = z.string().regex(REFRESH_TOKEN_PATTERN);

/** The app instance behind the request: push token holder and analytics identity link. */
export const installationSchema = z.object({
  installationId: z.string().regex(INSTALLATION_ID_PATTERN),
  platform: z.enum(PLATFORMS),
  appVersion: z.string().min(1).max(APP_VERSION_MAX_LENGTH),
  osVersion: z.string().min(1).max(DEVICE_TEXT_MAX_LENGTH).optional(),
  deviceModel: z.string().min(1).max(DEVICE_TEXT_MAX_LENGTH).optional(),
  fcmToken: z.string().min(1).max(FCM_TOKEN_MAX_LENGTH).optional(),
});
