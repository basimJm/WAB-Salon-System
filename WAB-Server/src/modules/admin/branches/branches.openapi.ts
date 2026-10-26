import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { API_PREFIXES } from '../../../constants/server';
import { ADMIN_BRANCH_ROUTES } from '../../../constants/branches';
import { z } from '../../../docs/zod';
import { registerBranchCrudDocs } from '../../shared/branches/branch.openapi';
import { reason } from '../salonEdit/salonEdit.validation';
import { salonBranchesParams, salonBranchesQuery } from './branches.validation';

export const registerAdminBranchDocs = (registry: OpenAPIRegistry): void => {
  registerBranchCrudDocs(registry, {
    base: `${API_PREFIXES.admin}${ADMIN_BRANCH_ROUTES.base}/{id}/branches`,
    tags: ['Salon branches'],
    who: 'admin; reason + audit, the owner is notified',
    params: salonBranchesParams,
    listQuery: salonBranchesQuery,
    extraBody: z.object({ reason }),
  });
};
