import { z } from 'zod';
import { AUDIT_FILTER_MAX_LENGTH } from '../../../constants/adminSettings';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

export const settingParams = z.object({
  key: z.string().trim().min(1).max(AUDIT_FILTER_MAX_LENGTH),
});
export const updateSettingBody = z.object({
  value: z.unknown().refine((v) => v !== undefined, 'value is required'),
  reason: z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH),
});
export const auditLogParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
export const auditLogsQuery = paginationQuery(ADMIN_PAGE_SIZE)
  .extend({
    adminId: z.string().regex(OBJECT_ID_PATTERN).optional(),
    action: z.string().trim().max(AUDIT_FILTER_MAX_LENGTH).optional(),
    entityType: z.string().trim().max(AUDIT_FILTER_MAX_LENGTH).optional(),
    entityId: z.string().trim().max(AUDIT_FILTER_MAX_LENGTH).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((q) => q.from === undefined || q.to === undefined || q.from <= q.to, {
    message: 'from must not be after to',
    path: ['to'],
  });
