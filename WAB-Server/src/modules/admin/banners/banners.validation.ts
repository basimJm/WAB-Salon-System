import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import {
  BANNER_ACTIONS,
  BANNER_AUDIENCES,
  BANNER_URL_MAX_LENGTH,
} from '../../../constants/banners';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { LOCALIZED_TEXT_MAX_LENGTH, SORT_ORDER_MAX } from '../../../constants/adminCrud';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const key = z.string().trim().min(1).max(LOCALIZED_TEXT_MAX_LENGTH);
const imageKey = z.object({ ar: key, en: key });
const date = z.coerce.date();
const order = z.number().int().min(0).max(SORT_ORDER_MAX);
/** A salon id or an https link; the action decides which one is allowed (checked in the service). */
const actionValue = z
  .string()
  .max(BANNER_URL_MAX_LENGTH)
  .refine((v) => OBJECT_ID_PATTERN.test(v) || /^https:\/\/\S+$/.test(v));

export const bannersQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  gender: z.enum(BANNER_AUDIENCES).optional(),
});
export const createBannerSchema = z.object({
  imageKey,
  action: z.enum(BANNER_ACTIONS).default('NONE'),
  actionValue: actionValue.optional(),
  gender: z.enum(BANNER_AUDIENCES),
  startAt: date,
  endAt: date,
  order: order.default(0),
  active: z.boolean().default(true),
  reason,
});
export const updateBannerSchema = z
  .object({
    imageKey: imageKey.optional(),
    action: z.enum(BANNER_ACTIONS).optional(),
    actionValue: actionValue.nullable().optional(),
    gender: z.enum(BANNER_AUDIENCES).optional(),
    startAt: date.optional(),
    endAt: date.optional(),
    order: order.optional(),
    active: z.boolean().optional(),
    reason,
  })
  .refine((v) => Object.keys(v).some((k) => k !== 'reason'), {
    message: 'at least one field to change',
  });
