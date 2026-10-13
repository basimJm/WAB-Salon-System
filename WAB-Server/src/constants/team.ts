/** Team management (SRV-051, Merchant PRD M17-M18, BUSINESS_DOMAIN.md §3.4, §6). */
export const ASSIGNABLE_ROLES = ['MANAGER', 'EMPLOYEE'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
export const MERCHANT_TEAM_ROUTES = {
  base: '/team/members',
  byId: '/:id',
  deactivate: '/:id/deactivate',
  reactivate: '/:id/reactivate',
} as const;
