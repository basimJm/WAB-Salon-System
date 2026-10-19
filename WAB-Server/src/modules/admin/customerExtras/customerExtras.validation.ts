import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { CAMPAIGN_LINK_MAX_LENGTH, CAMPAIGN_LINK_PATTERN } from '../../../constants/campaigns';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { GENDERS, LANGUAGES } from '../../../constants/enums';
import {
  EMAIL_MAX_LENGTH,
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
} from '../../../constants/identity';
import {
  NOTIFICATION_BODY_MAX_LENGTH,
  NOTIFICATION_TITLE_MAX_LENGTH,
} from '../../../constants/notifications';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { EMAIL_PATTERN } from '../../../constants/providers';
import { paginationQuery } from '../../../utils/pagination';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const name = z.string().trim().min(PERSON_NAME_MIN_LENGTH).max(PERSON_NAME_MAX_LENGTH);
const localized = (max: number): z.ZodObject<{ ar: z.ZodString; en: z.ZodString }> =>
  z.object({ ar: z.string().trim().min(1).max(max), en: z.string().trim().min(1).max(max) });

export const customerParams = z.object({ id: objectId });
export const pageQuery = paginationQuery(ADMIN_PAGE_SIZE);
/** What an admin may correct; the phone number is not here (it changes through the OTP flow). */
export const editCustomerBody = z
  .object({
    firstName: name,
    lastName: name,
    email: z.string().trim().max(EMAIL_MAX_LENGTH).regex(EMAIL_PATTERN),
    gender: z.enum(GENDERS),
    cityId: objectId,
    areaId: objectId,
    language: z.enum(LANGUAGES),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'at least one field to change',
  })
  .and(z.object({ reason }));
export const reasonBody = z.object({ reason });
export const pushBody = z.object({
  title: localized(NOTIFICATION_TITLE_MAX_LENGTH),
  body: localized(NOTIFICATION_BODY_MAX_LENGTH),
  link: z.string().max(CAMPAIGN_LINK_MAX_LENGTH).regex(CAMPAIGN_LINK_PATTERN).optional(),
  reason,
});
