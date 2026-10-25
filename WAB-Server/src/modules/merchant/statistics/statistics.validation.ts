import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { STATISTICS_MAX_RANGE_DAYS } from '../../../constants/statistics';
import { diffDays, isLocalDate } from '../../../utils/time';

const civilDate = z.string().refine(isLocalDate, 'YYYY-MM-DD');

/** Period in civil days (Asia/Amman, both included), at most `STATISTICS_MAX_RANGE_DAYS`. */
export const statisticsQuery = z
  .object({
    from: civilDate,
    to: civilDate,
    /** Owner only: one branch (a branch member always gets their own branch). */
    branchId: z.string().regex(OBJECT_ID_PATTERN).optional(),
  })
  .refine((q) => q.from <= q.to, { path: ['to'], message: 'to before from' })
  .refine((q) => q.from > q.to || diffDays(q.from, q.to) < STATISTICS_MAX_RANGE_DAYS, {
    path: ['to'],
    message: 'period too long',
  });
