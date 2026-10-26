import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';
import {
  branchReasonSchema,
  createBranchSchema,
  updateBranchSchema,
} from '../../shared/branches/branch.schemas';
import { reason } from '../salonEdit/salonEdit.validation';

const objectId = z.string().regex(OBJECT_ID_PATTERN);

export const salonBranchesParams = z.object({ id: objectId });
/** `?page=&pageSize=` of the admin branch list (SRV-171 S3). */
export const salonBranchesQuery = paginationQuery(ADMIN_PAGE_SIZE);
export const salonBranchParams = salonBranchesParams.extend({ branchId: objectId });
/** The owner's branch bodies plus the admin's reason (CLAUDE.md §4.12). */
export const adminCreateBranchBody = createBranchSchema.extend({ reason });
export const adminUpdateBranchBody = updateBranchSchema.and(z.object({ reason }));
export const adminBranchReasonBody = z.object({ reason });
/** Taking a branch offline: the reason is shown as the offline reason too. */
export const adminBranchOfflineBody = branchReasonSchema;
