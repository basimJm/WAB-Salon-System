import { z } from 'zod';
import { REPORT_MONTH_PATTERN } from '../../../constants/reports';
import { isLocalDate } from '../../../utils/time';

const day = z.string().refine((value) => isLocalDate(value));
export const dailyQuery = z.object({ date: day });
export const weeklyQuery = z.object({ from: day });
export const monthlyQuery = z.object({ month: z.string().regex(REPORT_MONTH_PATTERN) });
