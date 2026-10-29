import { useTranslation } from 'react-i18next';
import { AUDIENCES, BUSINESS_TYPES } from '@/domain/shared/businessType';
import { SegmentedControl } from '../components/form/SegmentedControl';
import { Select } from '../components/form/Select';
import { BUSINESS_TYPE_FILTER_KEY } from '../shared/businessFilter';
import { CATALOG_AUDIENCE_KEY, type CatalogKind } from './catalogKind';

export interface CatalogKindFiltersProps {
  kind: CatalogKind;
  /** Several URL filters in one change (a new type clears the audience). */
  onChange: (filters: Record<string, string[]>) => void;
}

/** Salons / Clinics switch of the catalog, plus the audience filter of salon services (§5.19). */
export function CatalogKindFilters({ kind, onChange }: CatalogKindFiltersProps) {
  const { t } = useTranslation();
  return (
    <>
      <SegmentedControl
        ariaLabel={t('business.type')}
        value={kind.businessType}
        options={BUSINESS_TYPES.map((b) => ({ value: b, label: t(`business.filter.${b}`) }))}
        onChange={(b) => onChange({ [BUSINESS_TYPE_FILTER_KEY]: [b], [CATALOG_AUDIENCE_KEY]: [] })}
      />
      {kind.businessType === 'SALON' ? (
        <Select
          label={t('business.audience')}
          value={kind.audience ?? ''}
          options={[
            { value: '', label: t('business.filter.ALL') },
            ...AUDIENCES.map((a) => ({ value: a, label: t(`status.audience.${a}`) })),
          ]}
          onChange={(e) =>
            onChange({ [CATALOG_AUDIENCE_KEY]: e.target.value ? [e.target.value] : [] })
          }
        />
      ) : null}
    </>
  );
}
