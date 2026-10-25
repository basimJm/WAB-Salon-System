import {
  COMPLETENESS_ITEMS,
  DEPOSIT_PERCENT_MAX,
  DEPOSIT_PERCENT_MIN,
  type CompletenessItem,
} from '../../constants/salon';
import type { BranchCompletenessItem } from '../../constants/branches';
import type { SalonRaw } from '../../models/salon.model';

/** Branch facts the salon's completeness depends on (§5.2). */
export interface BranchSummary {
  /** At least one branch is ACTIVE and complete. */
  readonly bookable: boolean;
  /** The main branch's own gaps; `null` when the salon has no main branch yet. */
  readonly mainMissing: readonly BranchCompletenessItem[] | null;
}

/** The salon-wide fields the rules read, plus what its branches allow. */
export interface CompletenessInput {
  readonly name: string;
  readonly coverKey?: string | undefined;
  readonly profileKey?: string | undefined;
  readonly description?: string | undefined;
  readonly policy?: SalonRaw['policy'] | undefined;
  readonly branches: BranchSummary;
}

const filled = (value: string | undefined): boolean => value !== undefined && value.trim() !== '';

const policyIsValid = (policy: SalonRaw['policy'] | undefined): boolean => {
  if (policy === undefined) return false;
  if (!(policy.cancellationWindowHours >= 0) || policy.paymentOptions.length < 1) return false;
  if (!policy.paymentOptions.includes('DEPOSIT')) return true;
  const percent = policy.depositPercentage;
  return (
    percent !== undefined &&
    Number.isInteger(percent) &&
    percent >= DEPOSIT_PERCENT_MIN &&
    percent <= DEPOSIT_PERCENT_MAX
  );
};

/**
 * What is still missing, in the order of the domain list (empty = complete). Without a bookable
 * branch the main branch's gaps are listed (what the owner must fix), else BRANCH.
 */
export const computeMissing = (input: CompletenessInput): CompletenessItem[] => {
  const salonPresent: Partial<Record<CompletenessItem, boolean>> = {
    COVER: filled(input.coverKey),
    PROFILE_IMAGE: filled(input.profileKey),
    NAME: filled(input.name),
    DESCRIPTION: filled(input.description),
    POLICY: policyIsValid(input.policy),
  };
  const branchGaps: readonly CompletenessItem[] = input.branches.bookable
    ? []
    : input.branches.mainMissing !== null && input.branches.mainMissing.length > 0
      ? input.branches.mainMissing
      : ['BRANCH'];
  return COMPLETENESS_ITEMS.filter(
    (item) => salonPresent[item] === false || branchGaps.includes(item),
  );
};
