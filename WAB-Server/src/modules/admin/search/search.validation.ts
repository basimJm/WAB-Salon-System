import { z } from 'zod';
import {
  ADMIN_SEARCH_MAX_LENGTH,
  ADMIN_SEARCH_MIN_LENGTH,
  ADMIN_SEARCH_PAGE_SIZE,
  ADMIN_SEARCH_TYPES,
} from '../../../constants/adminSearch';
import { paginationQuery } from '../../../utils/pagination';

const TYPE_SEPARATOR = ',';

export const searchQuery = paginationQuery(ADMIN_SEARCH_PAGE_SIZE).extend({
  q: z.string().trim().min(ADMIN_SEARCH_MIN_LENGTH).max(ADMIN_SEARCH_MAX_LENGTH),
  /** Comma-separated groups (`customers,salons`); absent = all. */
  types: z
    .string()
    .transform((value) => value.split(TYPE_SEPARATOR).map((part) => part.trim()))
    .pipe(z.array(z.enum(ADMIN_SEARCH_TYPES)).min(1))
    .optional(),
});
