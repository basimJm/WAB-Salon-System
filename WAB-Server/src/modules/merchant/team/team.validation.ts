import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { PERMISSIONS } from '../../../constants/enums';
import { PERSON_NAME_MAX_LENGTH, PERSON_NAME_MIN_LENGTH } from '../../../constants/identity';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import { STORAGE_KEY_MAX_LENGTH, STORAGE_KEY_PATTERN } from '../../../constants/salon';
import { ASSIGNABLE_ROLES } from '../../../constants/team';
import { paginationQuery } from '../../../utils/pagination';
import { phoneSchema } from '../../shared/auth/auth.schemas';

const name = z.string().trim().min(PERSON_NAME_MIN_LENGTH).max(PERSON_NAME_MAX_LENGTH);
const photoKey = z.string().max(STORAGE_KEY_MAX_LENGTH).regex(STORAGE_KEY_PATTERN);
/** Strings, not the enum: unknown and owner-only keys get their own error from `normalizeGrant`. */
const permissions = z.array(z.string().max(64)).max(PERMISSIONS.length + 8);

export const teamQuery = paginationQuery(APP_PAGE_SIZE);
export const memberParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
const branchIdSchema = z.string().regex(OBJECT_ID_PATTERN);

export const createMemberSchema = z.object({
  firstName: name,
  lastName: name,
  phone: phoneSchema,
  role: z.enum(ASSIGNABLE_ROLES),
  /** Omit to start from the role's template. */
  permissions: permissions.optional(),
  photoKey: photoKey.optional(),
  /** The member's branch (§3.4); omit for the salon's main branch. */
  branchId: branchIdSchema.optional(),
});
export const updateMemberSchema = z
  .object({
    firstName: name,
    lastName: name,
    photoKey: photoKey.nullable(),
    role: z.enum(ASSIGNABLE_ROLES),
    permissions,
    /** Moves the member to another branch of the salon (owner; their skills are cleared). */
    branchId: branchIdSchema,
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'at least one field to change',
  });
