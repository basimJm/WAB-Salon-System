import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { PAYOUT_STATUSES } from '../../../constants/enums';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { PAYOUT_NOTE_MAX_LENGTH, PAYOUT_REFERENCE_MAX_LENGTH } from '../../../constants/payouts';
import { isJodString, parseJod } from '../../../utils/money';
import { paginationQuery } from '../../../utils/pagination';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
const instant = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
const note = z.string().trim().min(1).max(PAYOUT_NOTE_MAX_LENGTH);

export const payoutParams = z.object({ id: objectId });
export const payoutsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  salonId: objectId.optional(),
  status: z.enum(PAYOUT_STATUSES).optional(),
});
export const balancesQuery = paginationQuery(ADMIN_PAGE_SIZE);
export const previewQuery = z.object({ salonId: objectId, periodTo: instant });
export const createPayoutBody = z.object({
  salonId: objectId,
  /** The end of the period: entries up to this instant are paid (never in the future). */
  periodTo: instant,
  note: note.optional(),
});
export const transferBody = z.object({
  /** JOD decimal string; must equal the payout's net. */
  amount: z
    .string()
    .refine((value) => isJodString(value))
    .transform((value) => parseJod(value)),
  transferredAt: instant,
  transferReference: z.string().trim().min(1).max(PAYOUT_REFERENCE_MAX_LENGTH),
  note,
});
