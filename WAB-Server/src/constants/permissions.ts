import { PERMISSIONS, type MemberRole, type Permission } from './enums';

/** Capabilities only the OWNER has; they are not permission keys and can never be granted. */
export const OWNER_ONLY_CAPABILITIES = [
  'TEAM_MANAGE',
  'PAYOUT_DETAILS_MANAGE',
  'SALON_DELETION',
  'BRANCHES_MANAGE',
] as const;

/**
 * Salon-wide permissions a branch member can never hold (BUSINESS_DOMAIN.md §6 branch scope):
 * finance, subscription and the policy stay with the owner. Dropped from grants and from what
 * older members were given before branches existed.
 */
export const OWNER_ONLY_PERMISSIONS: readonly Permission[] = [
  'FINANCE_VIEW',
  'SUBSCRIPTION_VIEW',
  'POLICIES_MANAGE',
];

/** What the owner is offered when adding a member (BUSINESS_DOMAIN.md §6 "default templates"). */
export const ROLE_TEMPLATES: Readonly<Record<Exclude<MemberRole, 'OWNER'>, readonly Permission[]>> =
  {
    MANAGER: PERMISSIONS.filter((p) => !OWNER_ONLY_PERMISSIONS.includes(p)),
    EMPLOYEE: ['BOOKINGS_VIEW_OWN', 'REVIEWS_VIEW'],
  };

export const PERMISSION_MODES = ['any', 'all'] as const;
export type PermissionMode = (typeof PERMISSION_MODES)[number];
