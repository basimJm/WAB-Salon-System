import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { GENDERS } from '../../../constants/enums';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { SALON_NAME_MAX_LENGTH, SALON_STATES } from '../../../constants/salon';
import { SUBSCRIPTION_STATUSES } from '../../../constants/subscriptions';
import { paginationQuery } from '../../../utils/pagination';

export const salonsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  state: z.enum(SALON_STATES).optional(),
  gender: z.enum(GENDERS).optional(),
  cityId: z.string().regex(OBJECT_ID_PATTERN).optional(),
  q: z.string().trim().max(SALON_NAME_MAX_LENGTH).optional(),
  subscription: z.enum(SUBSCRIPTION_STATUSES).optional(),
  /** `true` = only recommended salons, `false` = only the others. */
  recommended: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  /** `true` = only salons with a pending deletion request. */
  deletionRequested: z
    .enum(['true'])
    .transform(() => true)
    .optional(),
});
export const genderBody = z.object({
  gender: z.enum(GENDERS),
  reason: z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH),
});
