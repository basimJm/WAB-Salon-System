import { Router } from 'express';
import { API_PREFIXES, type ApiNamespace } from '../constants/server';
import { createAdminRouter } from '../modules/admin';
import { createCustomerRouter } from '../modules/customer';
import { createHealthRouter } from './health';
import { mount } from './mount';
import { createMerchantRouter } from '../modules/merchant';

export type NamespaceRouters = Readonly<Record<ApiNamespace, Router>>;

const defaultRouters = (): NamespaceRouters => ({
  customer: createCustomerRouter(),
  merchant: createMerchantRouter(),
  admin: createAdminRouter(),
});

/** Root router: each client namespace lives under its own prefix and token scope. */
export const createRootRouter = (
  routers: NamespaceRouters = defaultRouters(),
  health: Router = createHealthRouter(),
): Router => {
  const root = Router();
  mount(root, '', health);
  mount(root, API_PREFIXES.customer, routers.customer);
  mount(root, API_PREFIXES.merchant, routers.merchant);
  mount(root, API_PREFIXES.admin, routers.admin);
  return root;
};
