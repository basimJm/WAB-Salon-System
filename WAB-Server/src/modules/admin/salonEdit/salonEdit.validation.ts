import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { addGallerySchema, reorderSchema } from '../../shared/salonEdit/gallery.schemas';
import { profilePatchSchema } from '../../shared/salonEdit/profile.schemas';

/** Every admin write says why (CLAUDE.md §5.12). */
export const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const objectId = z.string().regex(OBJECT_ID_PATTERN);

export const salonParams = z.object({ id: objectId });
export const galleryItemParams = z.object({ id: objectId, itemId: objectId });
/** The merchant's patch plus the reason; `refine` is re-applied because `extend` drops it. */
export const editProfileBody = profilePatchSchema.and(z.object({ reason }));
export const addGalleryBody = addGallerySchema.extend({ reason });
export const reorderGalleryBody = reorderSchema.extend({ reason });
export const reasonBody = z.object({ reason });
