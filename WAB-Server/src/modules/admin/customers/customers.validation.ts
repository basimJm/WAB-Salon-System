import { z } from 'zod';
import { ADMIN_CUSTOMER_SEARCH_MAX_LENGTH } from '../../../constants/adminCustomers';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { CUSTOMER_STATUSES, GENDERS } from '../../../constants/enums';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

export const customerParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
export const customersQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  status: z.enum(CUSTOMER_STATUSES).optional(),
  gender: z.enum(GENDERS).optional(),
  cityId: z.string().regex(OBJECT_ID_PATTERN).optional(),
  q: z.string().trim().max(ADMIN_CUSTOMER_SEARCH_MAX_LENGTH).optional(),
});
export const reasonBody = z.object({
  reason: z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH),
});
