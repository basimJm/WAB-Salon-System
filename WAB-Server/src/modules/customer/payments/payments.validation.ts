import { z } from 'zod';
import { APP_VERSION_MAX_LENGTH } from '../../../constants/payments';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { PLATFORMS } from '../../../constants/enums';

export const startPaymentBody = z.object({
  draftId: z.string().regex(OBJECT_ID_PATTERN),
  platform: z.enum(PLATFORMS),
  appVersion: z.string().trim().min(1).max(APP_VERSION_MAX_LENGTH),
});
export const paymentParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
