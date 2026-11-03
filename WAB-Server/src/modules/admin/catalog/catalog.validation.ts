import { z } from 'zod';
import { LOCALIZED_TEXT_MAX_LENGTH, SORT_ORDER_MAX } from '../../../constants/adminCrud';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_KEY_MAX_LENGTH } from '../../../constants/providers';
import { FILE_REF_PATTERN } from '../../../constants/salon';
import { CATALOG_TEXT_MAX_LENGTH } from '../../../constants/catalog';
import { AUDIENCES, BUSINESS_TYPES } from '../../../constants/enums';
import { audienceFor } from '../../../domain/businessTypes/rules';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const localized = (max: number): z.ZodObject<{ ar: z.ZodString; en: z.ZodString }> => {
  const text = z.string().trim().min(1).max(max);
  return z.object({ ar: text, en: text });
};
const name = localized(LOCALIZED_TEXT_MAX_LENGTH);
const description = localized(CATALOG_TEXT_MAX_LENGTH);
/** A stored file path, never a URL: the public URL is built from it. */
const imageKey = z.string().trim().max(OBJECT_KEY_MAX_LENGTH).regex(FILE_REF_PATTERN);
const sortOrder = z.number().int().min(0).max(SORT_ORDER_MAX);

export const catalogAdminQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  businessType: z.enum(BUSINESS_TYPES).optional(),
  audience: z.enum(AUDIENCES).optional(),
});
/** A catalog service belongs to one business type; CLINIC and TATTOO services are always BOTH (§3.2, §5.19, §5.23). */
export const createCatalogSchema = z
  .object({
    name,
    description,
    imageKey,
    businessType: z.enum(BUSINESS_TYPES),
    audience: z.enum(AUDIENCES),
    active: z.boolean().default(true),
    sortOrder: sortOrder.default(0),
    reason,
  })
  .refine((v) => audienceFor(v.businessType, v.audience) === v.audience, {
    path: ['audience'],
    message: 'a CLINIC or TATTOO service is BOTH',
  });
/** Business type and audience of a catalog service cannot change: businesses already offer it. */
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
