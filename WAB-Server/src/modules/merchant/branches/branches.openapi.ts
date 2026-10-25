import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { MERCHANT_BRANCH_ROUTES } from '../../../constants/branches';
import { API_PREFIXES } from '../../../constants/server';
import { registerBranchCrudDocs } from '../../shared/branches/branch.openapi';

export const registerMerchantBranchDocs = (registry: OpenAPIRegistry): void => {
  registerBranchCrudDocs(registry, {
    base: `${API_PREFIXES.merchant}${MERCHANT_BRANCH_ROUTES.base}`,
    tags: ['Salon branches'],
    who: 'OWNER',
  });
};
