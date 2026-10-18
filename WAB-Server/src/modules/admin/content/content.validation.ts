import { z } from 'zod';
import {
  EMAIL_FIELD_MAX_LENGTH,
  MAINTENANCE_MESSAGE_MAX_LENGTH,
  APP_VERSION_PATTERN,
  CLIENT_PLATFORMS,
  STORE_URL_MAX_LENGTH,
  STORE_URL_PATTERN,
} from '../../../constants/appConfig';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { CONTENT_BODY_MAX_LENGTH, FAQ_TEXT_MAX_LENGTH } from '../../../constants/adminContent';
import { CONTENT_KINDS } from '../../../constants/content';
import { APP_KINDS } from '../../../constants/enums';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { E164_PATTERN, EMAIL_PATTERN } from '../../../constants/providers';
import { paginationQuery } from '../../../utils/pagination';

const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const app = z.enum(APP_KINDS);
const localized = (max: number): z.ZodObject<{ ar: z.ZodString; en: z.ZodString }> => {
  const text = z.string().trim().min(1).max(max);
  return z.object({ ar: text, en: text });
};
/** A PATCH body must change at least one field besides the reason. */
const withChange = <T extends z.ZodObject>(schema: T): z.ZodType<z.infer<T>> =>
  schema.refine((v) => Object.keys(v).some((k) => k !== 'reason'), {
    message: 'at least one field to change',
  }) as unknown as z.ZodType<z.infer<T>>;

export const pagesQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({ app: app.optional() });
export const createPageSchema = z.object({
  app,
  kind: z.enum(CONTENT_KINDS),
  body: localized(CONTENT_BODY_MAX_LENGTH),
  reason,
});
export const updatePageSchema = withChange(
  z.object({ body: localized(CONTENT_BODY_MAX_LENGTH).optional(), reason }),
);

const order = z.number().int().min(0).max(100_000);
export const faqsQuery = pagesQuery;
export const createFaqSchema = z.object({
  app,
  question: localized(FAQ_TEXT_MAX_LENGTH),
  answer: localized(FAQ_TEXT_MAX_LENGTH),
  order: order.default(0),
  reason,
});
export const updateFaqSchema = withChange(
  z.object({
    question: localized(FAQ_TEXT_MAX_LENGTH).optional(),
    answer: localized(FAQ_TEXT_MAX_LENGTH).optional(),
    order: order.optional(),
    reason,
  }),
);

const phone = z.string().regex(E164_PATTERN);
const email = z.string().trim().toLowerCase().max(EMAIL_FIELD_MAX_LENGTH).regex(EMAIL_PATTERN);
export const contactQuery = pagesQuery;
export const createContactSchema = z.object({ app, phone, whatsapp: phone, email, reason });
export const updateContactSchema = withChange(
  z.object({
    phone: phone.optional(),
    whatsapp: phone.optional(),
    email: email.optional(),
    reason,
  }),
);

const version = z.string().regex(APP_VERSION_PATTERN);
const storeUrl = z.string().max(STORE_URL_MAX_LENGTH).regex(STORE_URL_PATTERN);
export const versionsQuery = pagesQuery.extend({ platform: z.enum(CLIENT_PLATFORMS).optional() });
export const createVersionSchema = z.object({
  app,
  platform: z.enum(CLIENT_PLATFORMS),
  latest: version,
  minSupported: version,
  optionalUpdate: z.boolean().default(true),
  storeUrl,
  reason,
});
export const updateVersionSchema = withChange(
  z.object({
    latest: version.optional(),
    minSupported: version.optional(),
    optionalUpdate: z.boolean().optional(),
    storeUrl: storeUrl.optional(),
    reason,
  }),
);

export const maintenanceQuery = pagesQuery;
export const createMaintenanceSchema = z.object({
  app,
  enabled: z.boolean().default(false),
  message: localized(MAINTENANCE_MESSAGE_MAX_LENGTH),
  reason,
});
export const updateMaintenanceSchema = withChange(
  z.object({
    enabled: z.boolean().optional(),
    message: localized(MAINTENANCE_MESSAGE_MAX_LENGTH).optional(),
    reason,
  }),
);
