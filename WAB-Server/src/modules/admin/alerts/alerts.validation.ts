import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { ALERT_KINDS, ALERT_STATUSES } from '../../../constants/alerts';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

export const alertParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
export const alertsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  status: z.enum(ALERT_STATUSES).optional(),
  kind: z.enum(ALERT_KINDS).optional(),
});
