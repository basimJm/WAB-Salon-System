import { PERMISSIONS } from '../../../constants/enums';
import { z } from '../../../docs/zod';

/** A team member as the merchant team screens and the admin panel see it. */
export const teamMemberDoc = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  photoUrl: z.string().nullable(),
  role: z.enum(['OWNER', 'MANAGER', 'EMPLOYEE']),
  permissions: z.array(z.enum(PERMISSIONS)).describe('The OWNER always has all.'),
  active: z.boolean(),
  providesServices: z.boolean(),
  branchId: z
    .string()
    .nullable()
    .describe('The member’s branch; null for the owner (all branches)'),
});
