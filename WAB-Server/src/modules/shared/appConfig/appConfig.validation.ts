import { z } from 'zod';
import { APP_VERSION_PATTERN, CLIENT_PLATFORMS } from '../../../constants/appConfig';

export const appConfigQuerySchema = z.object({
  platform: z.enum(CLIENT_PLATFORMS),
  version: z.string().regex(APP_VERSION_PATTERN),
});
