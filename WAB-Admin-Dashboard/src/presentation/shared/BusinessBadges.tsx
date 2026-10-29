import type { Audience, BusinessType } from '@/domain/shared/businessType';
import { StatusBadge } from '../components/core/StatusBadge';

export interface BusinessBadgesProps {
  businessType: BusinessType;
  audience: Audience;
}

/** Type + audience badges of a salon or clinic (BUSINESS_DOMAIN §5.19). */
export function BusinessBadges({ businessType, audience }: BusinessBadgesProps) {
  return (
    <span className="wab-badge-row">
      <StatusBadge kind="businessType" value={businessType} />
      <StatusBadge kind="audience" value={audience} />
    </span>
  );
}
