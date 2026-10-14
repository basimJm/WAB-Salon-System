import { z } from 'zod';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';
import { isLocalDate } from '../../../utils/time';

const civilDate = z.string().refine(isLocalDate, 'YYYY-MM-DD');
/** Pagination plus an optional date range (Asia/Amman days, both inclusive). */
export const financeListQuery = paginationQuery(APP_PAGE_SIZE)
  .extend({ from: civilDate.optional(), to: civilDate.optional() })
  .refine((q) => q.from === undefined || q.to === undefined || q.from <= q.to, {
    path: ['to'],
    message: 'to before from',
  });
