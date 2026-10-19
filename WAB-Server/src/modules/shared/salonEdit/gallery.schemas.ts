import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { GALLERY_MAX_ITEMS, GALLERY_TYPES } from '../../../constants/gallery';
import { STORAGE_KEY_MAX_LENGTH, STORAGE_KEY_PATTERN } from '../../../constants/salon';

const key = z.string().max(STORAGE_KEY_MAX_LENGTH).regex(STORAGE_KEY_PATTERN);
export const addGallerySchema = z.object({
  type: z.enum(GALLERY_TYPES),
  /** Storage key returned by the confirmed upload (purpose GALLERY_IMAGE / GALLERY_VIDEO). */
  key,
  /** Optional poster image for a video (a confirmed GALLERY_IMAGE upload). */
  thumbnailKey: key.optional(),
  /** Video length reported by the app; must not exceed `uploads.videoMaxSec`. */
  durationSec: z.number().int().min(1).optional(),
});
export const reorderSchema = z.object({
  ids: z.array(z.string().regex(OBJECT_ID_PATTERN)).max(GALLERY_MAX_ITEMS),
});
export const galleryParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
