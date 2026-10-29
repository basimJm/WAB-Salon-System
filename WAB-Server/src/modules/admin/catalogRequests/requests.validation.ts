import { z } from 'zod';
import { LOCALIZED_TEXT_MAX_LENGTH, SORT_ORDER_MAX } from '../../../constants/adminCrud';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { CATALOG_TEXT_MAX_LENGTH } from '../../../constants/catalog';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { STORAGE_KEY_MAX_LENGTH, STORAGE_KEY_PATTERN } from '../../../constants/salon';
import { CATALOG_REQUEST_STATUSES } from '../../../constants/salonServices';
import { paginationQuery } from '../../../utils/pagination';
import { BUSINESS_TYPES } from '../../../constants/enums';

const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const localized = (max: number): z.ZodObject<{ ar: z.ZodString; en: z.ZodString }> => {
  const text = z.string().trim().min(1).max(max);
  return z.object({ ar: text, en: text });
};

export const requestsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  status: z.enum(CATALOG_REQUEST_STATUSES).optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
});
export const requestParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
/** The salon wrote one language; the admin supplies both for the catalog entry. */
const createApproval = z.object({
  name: localized(LOCALIZED_TEXT_MAX_LENGTH),
  description: localized(CATALOG_TEXT_MAX_LENGTH),
  /** Needed when the request came without a picture. */
  imageKey: z.string().max(STORAGE_KEY_MAX_LENGTH).regex(STORAGE_KEY_PATTERN).optional(),
  sortOrder: z.number().int().min(0).max(SORT_ORDER_MAX).default(0),
  reason,
});
/** SRV-125: the requested service already exists in the catalog under another name. */
const mapApproval = z.object({ catalogServiceId: z.string().regex(OBJECT_ID_PATTERN), reason });
/** Either a new catalog entry (names in both languages) or a mapping to an existing one. */
export const approveSchema = z.union([mapApproval.strict(), createApproval.strict()]);
export const rejectSchema = z.object({ reason });
