import {
  COMPLETENESS_ITEMS,
  DEPOSIT_PERCENT_MAX,
  DEPOSIT_PERCENT_MIN,
  type CompletenessItem,
} from '../../constants/salon';
import type { SalonRaw } from '../../models/salon.model';

/** The salon fields the rules read, plus counts that live in other collections. */
export interface CompletenessInput {
  readonly name: string;
  readonly coverKey?: string | undefined;
  readonly profileKey?: string | undefined;
  readonly description?: string | undefined;
  readonly phone?: string | undefined;
  readonly location?: { readonly coordinates: readonly number[] } | undefined;
  readonly weeklySchedule: readonly { readonly isOff: boolean }[];
  readonly policy?: SalonRaw['policy'] | undefined;
  /** Active salon services. */
  readonly activeServices: number;
  /** Active members who provide services, with at least one service and one working day. */
  readonly qualifiedStaff: number;
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

/** What is still missing, in the order of the domain list (empty = complete). */
export const computeMissing = (input: CompletenessInput): CompletenessItem[] => {
  const present: Record<CompletenessItem, boolean> = {
    COVER: filled(input.coverKey),
    PROFILE_IMAGE: filled(input.profileKey),
    NAME: filled(input.name),
    DESCRIPTION: filled(input.description),
    LOCATION: input.location !== undefined && input.location.coordinates.length === 2,
    PHONE: filled(input.phone),
    WORKING_HOURS: input.weeklySchedule.some((day) => !day.isOff),
    SERVICE: input.activeServices >= 1,
    STAFF: input.qualifiedStaff >= 1,
    POLICY: policyIsValid(input.policy),
  };
  return COMPLETENESS_ITEMS.filter((item) => !present[item]);
};
