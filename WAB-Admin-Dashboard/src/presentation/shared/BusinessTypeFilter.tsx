import { useTranslation } from 'react-i18next';
import { BUSINESS_TYPES, isBusinessType, type BusinessType } from '@/domain/shared/businessType';
import { SegmentedControl } from '../components/form/SegmentedControl';

const ALL = 'ALL';
type Choice = BusinessType | typeof ALL;
const CHOICES: readonly Choice[] = [ALL, ...BUSINESS_TYPES];

export interface BusinessTypeFilterProps {
  value: BusinessType | undefined;
  onChange: (value: BusinessType | undefined) => void;
}

/** All / Salons / Clinics switch of the business lists (BUSINESS_DOMAIN §5.19); the server filters. */
export function BusinessTypeFilter({ value, onChange }: BusinessTypeFilterProps) {
  const { t } = useTranslation();
  return (
    <SegmentedControl<Choice>
      ariaLabel={t('business.type')}
      value={value ?? ALL}
      options={CHOICES.map((c) => ({ value: c, label: t(`business.filter.${c}`) }))}
      onChange={(next) => onChange(isBusinessType(next) ? next : undefined)}
    />
  );
}
