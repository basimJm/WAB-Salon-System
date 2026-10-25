import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { z } from 'zod';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';
import { isLocalDate } from '../../../utils/time';

const civilDate = z.string().refine(isLocalDate, 'YYYY-MM-DD');
const rangeQuery = paginationQuery(APP_PAGE_SIZE).extend({
  from: civilDate.optional(),
  to: civilDate.optional(),
});
const ordered = (q: { from?: string | undefined; to?: string | undefined }): boolean =>
  q.from === undefined || q.to === undefined || q.from <= q.to;
/** Pagination plus an optional date range (Asia/Amman days, both inclusive). */
export const financeListQuery = rangeQuery.refine(ordered, {
  path: ['to'],
  message: 'to before from',
});
/** Payments and refunds can also be narrowed to one branch (§5.14). */
export const branchFinanceListQuery = rangeQuery
  .extend({ branchId: z.string().regex(OBJECT_ID_PATTERN).optional() })
  .refine(ordered, { path: ['to'], message: 'to before from' });
