import type { LocalizedName } from './referenceData';

/** Salon branches (SRV-136, BUSINESS_DOMAIN.md §3.3a, §5.2, §5.16). */
export const BRANCHES_COLLECTION = 'branches';

/** `CLOSED` = deactivated for good; kept for history, never deleted. */
export const BRANCH_STATUSES = ['ACTIVE', 'OFFLINE', 'CLOSED'] as const;
export type BranchStatus = (typeof BRANCH_STATUSES)[number];
/** Branches that still count for the salon (cards, limits, the last-branch rule). */
export const OPEN_BRANCH_STATUSES = [
  'ACTIVE',
  'OFFLINE',
] as const satisfies readonly BranchStatus[];

export const BRANCH_NAME_MIN_LENGTH = 1;
export const BRANCH_NAME_MAX_LENGTH = 60;
export const BRANCH_LOCATION_TEXT_MAX_LENGTH = 300;
export const BRANCH_OFFLINE_REASON_MAX_LENGTH = 1_000;

/** Who took a branch offline: the admin or the salon owner. */
export const BRANCH_OFFLINE_ACTOR_TYPES = ['ADMIN', 'MEMBER'] as const;
export type BranchOfflineActorType = (typeof BRANCH_OFFLINE_ACTOR_TYPES)[number];

/** What a branch still needs before customers can book it (§5.2, branch level). */
export const BRANCH_COMPLETENESS_ITEMS = [
  'LOCATION',
  'PHONE',
  'WORKING_HOURS',
  'SERVICE',
  'STAFF',
] as const;
export type BranchCompletenessItem = (typeof BRANCH_COMPLETENESS_ITEMS)[number];

/** Name of the branch a salon gets on migration when it has no area name (§5.16). */
export const MAIN_BRANCH_DEFAULT_NAME: LocalizedName = { ar: 'الفرع الرئيسي', en: 'Main branch' };
