import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { exportRequestSchema } from '../../../domain/exports/exportRequest';
import { paginationQuery } from '../../../utils/pagination';

export const createExportBody = exportRequestSchema;
export const exportParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
export const exportsQuery = paginationQuery(ADMIN_PAGE_SIZE);
