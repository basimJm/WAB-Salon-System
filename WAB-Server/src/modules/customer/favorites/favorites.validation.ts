import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

export const favoriteParamsSchema = z.object({ salonId: z.string().regex(OBJECT_ID_PATTERN) });
export const favoritesQuerySchema = paginationQuery(APP_PAGE_SIZE);
