import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { TRANSACTION_STATUSES, TRANSACTION_TYPES } from '../../../constants/enums';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
const instant = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

export const transactionParams = z.object({ id: objectId });
export const transactionsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  status: z.enum(TRANSACTION_STATUSES).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  salonId: objectId.optional(),
  customerId: objectId.optional(),
  bookingId: objectId.optional(),
  from: instant.optional(),
  to: instant.optional(),
});
