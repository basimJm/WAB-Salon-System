import { PERMISSIONS, type MemberRole, type Permission } from './enums';

/** Capabilities only the OWNER has; they are not permission keys and can never be granted. */
export const OWNER_ONLY_CAPABILITIES = [
  'TEAM_MANAGE',
  'PAYOUT_DETAILS_MANAGE',
  'SALON_DELETION',
] as const;

/** What the owner is offered when adding a member (BUSINESS_DOMAIN.md §6 "default templates"). */
const MANAGER_WITHHELD: readonly Permission[] = ['FINANCE_VIEW', 'POLICIES_MANAGE'];
export const ROLE_TEMPLATES: Readonly<Record<Exclude<MemberRole, 'OWNER'>, readonly Permission[]>> =
  {
    MANAGER: PERMISSIONS.filter((p) => !MANAGER_WITHHELD.includes(p)),
    EMPLOYEE: ['BOOKINGS_VIEW_OWN', 'REVIEWS_VIEW'],
  };

export const PERMISSION_MODES = ['any', 'all'] as const;
export type PermissionMode = (typeof PERMISSION_MODES)[number];
