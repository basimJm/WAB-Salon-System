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
