import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { ADMIN_CANCEL_MODES } from '../../../constants/bookings';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { isJodString, parseJod } from '../../../utils/money';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
/** Persons of one booking: the customer plus up to five companions. */
const personIndex = z.number().int().min(0).max(5);

export const bookingParams = z.object({ id: objectId });
export const eligibleQuery = z.object({ personIndex: z.coerce.number().int().min(0).max(5) });
export const reassignBody = z.object({ personIndex, staffId: objectId, reason });
export const cancelBody = z.object({ mode: z.enum(ADMIN_CANCEL_MODES), reason });
/** `"5.000"` on the wire, integer fils inside; must be above zero. */
export const refundBody = z.object({
  amount: z
    .string()
    .refine((v) => isJodString(v))
    .transform((v) => parseJod(v))
    .refine((fils) => fils > 0),
  reason,
});
