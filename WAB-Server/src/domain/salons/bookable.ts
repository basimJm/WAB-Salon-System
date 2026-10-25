import { ERROR_CODES } from '../../constants/errorCodes';
import type { SalonRaw } from '../../models/salon.model';
import { BusinessRuleError } from '../../utils/errors';

type Visibility = Pick<SalonRaw, 'state' | 'completeness'>;

/** Customers see a salon only when it is LIVE and complete (BUSINESS_DOMAIN.md §5.2). */
export const isCustomerVisible = (salon: Visibility): boolean =>
  salon.state === 'LIVE' && salon.completeness.isComplete;

/**
 * New bookings need a visible salon. A LIVE salon that lost something (last service switched off)
 * keeps its existing bookings but refuses new ones with `SALON_NOT_BOOKABLE`.
 */
export const assertSalonBookable = (salon: Visibility): void => {
  if (!isCustomerVisible(salon))
    throw new BusinessRuleError({ code: ERROR_CODES.SALON_NOT_BOOKABLE });
};

type BranchVisibility = {
  readonly status: string;
  readonly completeness: { readonly isComplete: boolean };
};

/** A branch takes new bookings when its salon is visible and it is ACTIVE and complete (§5.2). */
export const isBranchBookable = (salon: Visibility, branch: BranchVisibility): boolean =>
  isCustomerVisible(salon) && branch.status === 'ACTIVE' && branch.completeness.isComplete;

/** New bookings need a bookable branch: `SALON_NOT_BOOKABLE` first, then `BRANCH_NOT_BOOKABLE`. */
export const assertBranchBookable = (salon: Visibility, branch: BranchVisibility): void => {
  assertSalonBookable(salon);
  if (!isBranchBookable(salon, branch))
    throw new BusinessRuleError({ code: ERROR_CODES.BRANCH_NOT_BOOKABLE });
};
