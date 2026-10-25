import type { BranchCompletenessItem } from '../../constants/branches';

/** What a branch's completeness depends on (§5.2, branch level). */
export interface BranchCompletenessInput {
  readonly location?: { readonly coordinates: readonly number[] } | undefined;
  readonly phone?: string | undefined;
  readonly weeklySchedule: readonly { readonly isOff: boolean }[];
  /** Active salon services of the branch. */
  readonly activeServices: number;
  /** Active members of the branch who provide services, with ≥1 service and ≥1 working day. */
  readonly qualifiedStaff: number;
}

const LOCATION_COORDINATES = 2;

/** What the branch still lacks before customers can book it, in the domain's order (empty = complete). */
export const computeBranchMissing = (input: BranchCompletenessInput): BranchCompletenessItem[] => {
  const present: Record<BranchCompletenessItem, boolean> = {
    LOCATION: input.location?.coordinates.length === LOCATION_COORDINATES,
    PHONE: input.phone !== undefined && input.phone.trim().length > 0,
    WORKING_HOURS: input.weeklySchedule.some((day) => !day.isOff),
    SERVICE: input.activeServices >= 1,
    STAFF: input.qualifiedStaff >= 1,
  };
  return (Object.keys(present) as BranchCompletenessItem[]).filter((item) => !present[item]);
};
