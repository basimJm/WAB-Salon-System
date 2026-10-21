import { z } from 'zod';
import { LOCALIZED_TEXT_MAX_LENGTH, SORT_ORDER_MAX } from '../../../constants/adminCrud';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { COUNTRY_CODE_PATTERN, DIAL_CODE_PATTERN } from '../../../constants/referenceData';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_KEY_MAX_LENGTH, OBJECT_KEY_PATTERN } from '../../../constants/providers';
import { paginationQuery } from '../../../utils/pagination';

const text = z.string().trim().min(1).max(LOCALIZED_TEXT_MAX_LENGTH);
const localized = z.object({ ar: text, en: text });
const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const sortOrder = z.number().int().min(0).max(SORT_ORDER_MAX);
const regex = z
  .string()
  .min(1)
  .refine((v) => {
    try {
      return new RegExp(v) instanceof RegExp;
    } catch {
      return false;
    }
  });
const nonEmptyPatch = <T extends z.ZodObject>(schema: T): z.ZodType<z.infer<T>> =>
  schema.refine((v) => Object.keys(v).some((k) => k !== 'reason'), {
    message: 'at least one field to change',
  }) as unknown as z.ZodType<z.infer<T>>;

const countryFields = {
  name: localized,
  dialCode: z.string().regex(DIAL_CODE_PATTERN),
  /** A stored file path (e.g. `flags/jo.svg`), never a URL: the public URL is built from it. */
  flagKey: z.string().trim().max(OBJECT_KEY_MAX_LENGTH).regex(OBJECT_KEY_PATTERN),
  phoneRegex: regex,
  active: z.boolean(),
  sortOrder,
};
export const createCountrySchema = z.object({
  code: z.string().regex(COUNTRY_CODE_PATTERN),
  ...countryFields,
  active: countryFields.active.default(true),
  sortOrder: sortOrder.default(0),
  reason,
});
export const updateCountrySchema = nonEmptyPatch(
  z.object({
    name: localized.optional(),
    dialCode: countryFields.dialCode.optional(),
    flagKey: countryFields.flagKey.optional(),
    phoneRegex: regex.optional(),
    active: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
    reason,
  }),
);

export const createCitySchema = z.object({
  name: localized,
  countryCode: z.string().regex(COUNTRY_CODE_PATTERN),
  active: z.boolean().default(true),
  sortOrder: sortOrder.default(0),
  reason,
});
export const updateCitySchema = nonEmptyPatch(
  z.object({
    name: localized.optional(),
    active: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
    reason,
  }),
);

export const createAreaSchema = z.object({
  cityId: z.string().regex(OBJECT_ID_PATTERN),
  name: localized,
  active: z.boolean().default(true),
  sortOrder: sortOrder.default(0),
  reason,
});
export const updateAreaSchema = updateCitySchema;

export const countriesQuery = paginationQuery(ADMIN_PAGE_SIZE);
export const citiesQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  countryCode: z.string().regex(COUNTRY_CODE_PATTERN).optional(),
});
export const areasQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  cityId: z.string().regex(OBJECT_ID_PATTERN).optional(),
});
