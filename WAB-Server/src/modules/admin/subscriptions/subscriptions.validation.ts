import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import {
  SUBSCRIPTION_METHOD_MAX_LENGTH,
  SUBSCRIPTION_NOTE_MAX_LENGTH,
  SUBSCRIPTION_REFERENCE_MAX_LENGTH,
  SUBSCRIPTION_STATUSES,
} from '../../../constants/subscriptions';
import { isJodString, parseJod } from '../../../utils/money';
import { paginationQuery } from '../../../utils/pagination';

const instant = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

export const salonParams = z.object({ salonId: z.string().regex(OBJECT_ID_PATTERN) });
export const subscriptionsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  endingInDays: z.coerce.number().int().min(0).max(365).optional(),
});
export const recordPaymentBody = z.object({
  /** JOD decimal string. */
  amount: z
    .string()
    .refine((value) => isJodString(value))
    .transform((value) => parseJod(value)),
  paidAt: instant,
  periodFrom: instant,
  periodTo: instant,
  method: z.string().trim().min(1).max(SUBSCRIPTION_METHOD_MAX_LENGTH),
  reference: z.string().trim().min(1).max(SUBSCRIPTION_REFERENCE_MAX_LENGTH),
  note: z.string().trim().min(1).max(SUBSCRIPTION_NOTE_MAX_LENGTH).optional(),
});
