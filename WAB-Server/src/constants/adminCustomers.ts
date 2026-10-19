import { CUSTOMER_STATUSES } from './enums';

/** Admin customer management (SRV-101, Admin PRD A12). */
export const ADMIN_CUSTOMER_ROUTES = {
  base: '/customers',
  byId: '/:id',
  block: '/:id/block',
  unblock: '/:id/unblock',
  delete: '/:id/delete',
  restore: '/:id/restore',
  reviews: '/:id/reviews',
  notifications: '/:id/notifications',
  forceDelete: '/:id/force-delete',
  push: '/:id/push',
} as const;
export const ADMIN_CUSTOMER_SEARCH_MAX_LENGTH = 100;
export const ADMIN_CUSTOMER_STATUS_FILTER = CUSTOMER_STATUSES;
export const ADMIN_CUSTOMER_AUDIT = {
  delete: 'CUSTOMER_DELETE',
  restore: 'CUSTOMER_RESTORE',
  edit: 'CUSTOMER_EDIT',
} as const;
/** Devices shown in a customer's detail. */
export const ADMIN_CUSTOMER_MAX_DEVICES = 20;
