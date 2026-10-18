import { z } from 'zod';
import { LANGUAGES } from '../../../constants/enums';
import { installationSchema } from '../auth/auth.schemas';

/** The device record sent by the app; the language defaults to the request language. */
export const registerInstallationSchema = installationSchema.extend({
  language: z.enum(LANGUAGES).optional(),
});
export const pushEnabledSchema = z.object({ pushEnabled: z.boolean() });
