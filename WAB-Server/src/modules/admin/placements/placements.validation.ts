import { z } from 'zod';
import { SORT_ORDER_MAX } from '../../../constants/adminCrud';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { AUDIENCES, BUSINESS_TYPES } from '../../../constants/enums';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import {
  PLACEMENT_NOTE_MAX_LENGTH,
  PLACEMENT_REORDER_MAX,
  PLACEMENT_STATUSES,
} from '../../../constants/placements';
import { isJodString, parseJod } from '../../../utils/money';
import { paginationQuery } from '../../../utils/pagination';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
const order = z.number().int().min(0).max(SORT_ORDER_MAX);
const amount = z
  .string()
  .refine((v) => isJodString(v))
  .transform((v) => parseJod(v));
const note = z.string().trim().max(PLACEMENT_NOTE_MAX_LENGTH);

export const placementsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  businessType: z.enum(BUSINESS_TYPES).optional(),
  audience: z.enum(AUDIENCES).optional(),
  status: z.enum(PLACEMENT_STATUSES).optional(),
  salonId: objectId.optional(),
});
export const placementParams = z.object({ id: objectId });
/** Business type and audience are copied from the salon; never sent. `amountPaid` is a JOD string. */
export const createPlacementBody = z.object({
  salonId: objectId,
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  order: order.default(0),
  amountPaid: amount,
  note: note.optional(),
  reason,
});
export const updatePlacementBody = z
  .object({
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    order: order.optional(),
    amountPaid: amount.optional(),
    note: note.nullable().optional(),
    reason,
  })
  .refine((v) => Object.keys(v).some((k) => k !== 'reason'), {
    message: 'at least one field to change',
  });
export const endPlacementBody = z.object({ reason });
export const reorderBody = z.object({
  businessType: z.enum(BUSINESS_TYPES),
  ids: z.array(objectId).min(1).max(PLACEMENT_REORDER_MAX),
  reason,
});
