import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { CLOSURE_REASON_MAX_LENGTH } from '../../../constants/hours';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { isLocalDate } from '../../../utils/time';
import { paginationQuery } from '../../../utils/pagination';
import { addGallerySchema, reorderSchema } from '../../shared/salonEdit/gallery.schemas';
import { weeklySchema } from '../../shared/salonEdit/hours.schemas';
import { policySchema } from '../../shared/salonEdit/policy.schemas';
import { addServiceSchema, updateServiceSchema } from '../../shared/salonEdit/services.schemas';
import { staffProfileSchema } from '../../shared/salonEdit/staff.schemas';
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

const date = z.string().refine(isLocalDate);
/** Why the salon is closed (shown to customers) is `closureReason`; `reason` is the admin's audit reason. */
const closureReason = z.string().trim().min(1).max(CLOSURE_REASON_MAX_LENGTH);

export const hoursBody = weeklySchema.extend({ reason });
export const previewHoursBody = weeklySchema;
export const previewClosureBody = z.object({ from: date, to: date });
export const closureBody = z.object({ from: date, to: date, closureReason, reason });
export const closurePatchBody = z
  .object({ from: date, to: date, closureReason })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'at least one field to change',
  })
  .and(z.object({ reason }));
export const closureParams = z.object({ id: objectId, closureId: objectId });

export const servicesQuery = paginationQuery(ADMIN_PAGE_SIZE);
export const addServiceBody = addServiceSchema.extend({ reason });
export const updateServiceBody = updateServiceSchema.and(z.object({ reason }));
export const serviceParams = z.object({ id: objectId, serviceId: objectId });

export const staffParams = z.object({ id: objectId, memberId: objectId });
export const staffBody = staffProfileSchema.extend({ reason });

export const policyBody = policySchema.and(z.object({ reason }));
