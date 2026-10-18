import { z } from 'zod';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import { STORAGE_KEY_MAX_LENGTH, STORAGE_KEY_PATTERN } from '../../../constants/salon';
import {
  CATALOG_REQUEST_DESCRIPTION_MAX_LENGTH,
  CATALOG_REQUEST_NAME_MAX_LENGTH,
} from '../../../constants/salonServices';
import { paginationQuery } from '../../../utils/pagination';

export const requestsQuery = paginationQuery(APP_PAGE_SIZE);
/** "Can't find your service? Request it": text in the salon's own language, optional picture. */
export const createRequestSchema = z.object({
  name: z.string().trim().min(1).max(CATALOG_REQUEST_NAME_MAX_LENGTH),
  description: z.string().trim().min(1).max(CATALOG_REQUEST_DESCRIPTION_MAX_LENGTH),
  imageKey: z.string().max(STORAGE_KEY_MAX_LENGTH).regex(STORAGE_KEY_PATTERN).optional(),
});
