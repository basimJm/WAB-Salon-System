import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import {
  CAMPAIGN_AUDIENCE_KINDS,
  CAMPAIGN_LINK_MAX_LENGTH,
  CAMPAIGN_LINK_PATTERN,
  CAMPAIGN_MAX_CITIES,
  CAMPAIGN_MAX_SPECIFIC_USERS,
  CAMPAIGN_STATUSES,
} from '../../../constants/campaigns';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { APP_KINDS, GENDERS } from '../../../constants/enums';
import {
  NOTIFICATION_BODY_MAX_LENGTH,
  NOTIFICATION_TITLE_MAX_LENGTH,
} from '../../../constants/notifications';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const localized = (max: number): z.ZodObject<{ ar: z.ZodString; en: z.ZodString }> =>
  z.object({ ar: z.string().trim().min(1).max(max), en: z.string().trim().min(1).max(max) });

/** The extra field each audience kind needs; kinds without one must not carry any. */
const audienceSchema = z
  .object({
    kind: z.enum(CAMPAIGN_AUDIENCE_KINDS),
    gender: z.enum(GENDERS).optional(),
    cityIds: z.array(objectId).min(1).max(CAMPAIGN_MAX_CITIES).optional(),
    salonId: objectId.optional(),
    customerIds: z.array(objectId).min(1).max(CAMPAIGN_MAX_SPECIFIC_USERS).optional(),
  })
  .strict()
  .superRefine((audience, ctx) => {
    const needs: Record<string, 'gender' | 'cityIds' | 'salonId' | 'customerIds' | undefined> = {
      GENDER: 'gender',
      CITY: 'cityIds',
      SALON_MEMBERS: 'salonId',
      SPECIFIC_USERS: 'customerIds',
    };
    const required = needs[audience.kind];
    for (const field of ['gender', 'cityIds', 'salonId', 'customerIds'] as const) {
      const present = audience[field] !== undefined;
      if (field === required && !present) {
        ctx.addIssue({ code: 'custom', path: [field], message: 'required for this audience' });
      }
      if (field !== required && present) {
        ctx.addIssue({ code: 'custom', path: [field], message: 'not used by this audience' });
      }
    }
  });

export const campaignParams = z.object({ id: objectId });
export const campaignsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  app: z.enum(APP_KINDS).optional(),
});
export const createCampaignBody = z.object({
  title: localized(NOTIFICATION_TITLE_MAX_LENGTH),
  body: localized(NOTIFICATION_BODY_MAX_LENGTH),
  app: z.enum(APP_KINDS),
  audience: audienceSchema,
  link: z.string().trim().max(CAMPAIGN_LINK_MAX_LENGTH).regex(CAMPAIGN_LINK_PATTERN).optional(),
  scheduledAt: z.coerce.date().optional(),
  reason,
});
export const audienceSizeBody = z.object({ app: z.enum(APP_KINDS), audience: audienceSchema });
export const cancelCampaignBody = z.object({ reason });
