import { z } from 'zod';
import { CONTENT_TYPE_PATTERN } from '../../../constants/providers';
import { OBJECT_KEY_MAX_LENGTH, OBJECT_KEY_PATTERN } from '../../../constants/providers';
import { UPLOAD_PURPOSES } from '../../../constants/uploads';

export const presignSchema = z.object({
  purpose: z.enum(UPLOAD_PURPOSES),
  contentType: z.string().max(100).regex(CONTENT_TYPE_PATTERN),
  /** Size in bytes the client is about to upload. */
  size: z.number().int().min(1),
});
/** The public license route has no purpose: it is always a license document. */
export const licensePresignSchema = presignSchema.omit({ purpose: true });
export const confirmSchema = z.object({
  key: z.string().max(OBJECT_KEY_MAX_LENGTH).regex(OBJECT_KEY_PATTERN),
});
