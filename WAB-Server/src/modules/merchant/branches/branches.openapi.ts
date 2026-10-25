import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { MERCHANT_BRANCH_ROUTES } from '../../../constants/branches';
import { API_PREFIXES } from '../../../constants/server';
import { branchParams } from '../../shared/branches/branch.schemas';
import { registerBranchCrudDocs } from '../../shared/branches/branch.openapi';
import { registerMerchantHoursDocs } from '../hours/hours.openapi';
import { registerMerchantServicesDocs } from '../services/services.openapi';

export const registerMerchantBranchDocs = (registry: OpenAPIRegistry): void => {
  registerBranchCrudDocs(registry, {
    base: `${API_PREFIXES.merchant}${MERCHANT_BRANCH_ROUTES.base}`,
    tags: ['Salon branches'],
    who: 'OWNER',
  });
  // Hours/closures and services of one branch: the salon-level operations, addressed to it
  // (owner: any branch; a manager: their own, else 403 BRANCH_SCOPE_DENIED).
  const branchBase = `${API_PREFIXES.merchant}${MERCHANT_BRANCH_ROUTES.base}/{branchId}`;
  registerMerchantHoursDocs(registry, { base: `${branchBase}/hours`, params: branchParams });
  registerMerchantServicesDocs(registry, { base: `${branchBase}/services`, params: branchParams });
};
