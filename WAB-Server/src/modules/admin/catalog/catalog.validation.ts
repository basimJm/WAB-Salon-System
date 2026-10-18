import { z } from 'zod';
import { LOCALIZED_TEXT_MAX_LENGTH, SORT_ORDER_MAX } from '../../../constants/adminCrud';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { CATALOG_TEXT_MAX_LENGTH } from '../../../constants/catalog';
import { GENDERS } from '../../../constants/enums';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const localized = (max: number): z.ZodObject<{ ar: z.ZodString; en: z.ZodString }> => {
  const text = z.string().trim().min(1).max(max);
  return z.object({ ar: text, en: text });
};
const name = localized(LOCALIZED_TEXT_MAX_LENGTH);
const description = localized(CATALOG_TEXT_MAX_LENGTH);
const imageKey = z.string().trim().min(1).max(LOCALIZED_TEXT_MAX_LENGTH);
const sortOrder = z.number().int().min(0).max(SORT_ORDER_MAX);

export const catalogAdminQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  gender: z.enum(GENDERS).optional(),
});
export const createCatalogSchema = z.object({
  name,
  description,
  imageKey,
  gender: z.enum(GENDERS),
  active: z.boolean().default(true),
  sortOrder: sortOrder.default(0),
  reason,
});
/** The audience (gender) of a catalog service cannot change: salons already offer it. */
export const updateCatalogSchema = z
  .object({
    name: name.optional(),
    description: description.optional(),
    imageKey: imageKey.optional(),
    active: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
    reason,
  })
  .refine((v) => Object.keys(v).some((k) => k !== 'reason'), {
    message: 'at least one field to change',
  });
