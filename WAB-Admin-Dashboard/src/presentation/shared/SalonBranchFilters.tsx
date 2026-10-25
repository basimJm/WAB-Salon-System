import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MAX_PAGE_SIZE } from '@/constants/ui';
import { Combobox } from '../components/form/Combobox';
import { Select } from '../components/form/Select';
import { useBranchOptions } from '../hooks/useBranchOptions';

export interface SalonBranchFiltersProps {
  salon: string;
  branch: string;
  /** A new salon clears the branch (branches belong to one salon). */
  onChange: (next: { salon: string; branch: string }) => void;
}

/** Salon picker + the branch filter of that salon (BUSINESS_DOMAIN §3.3a); the branch select appears once a salon is set. */
export function SalonBranchFilters({ salon, branch, onChange }: SalonBranchFiltersProps) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const salons = useQuery({
    queryKey: ['getSalons', 'options'],
    queryFn: () => repositories.salons.list({ page: 1, pageSize: MAX_PAGE_SIZE }),
  });
  const branches = useBranchOptions(salon || undefined);
  const salonOptions = (salons.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
  return (
    <>
      <Combobox
        label={t('branches.filter.salon')}
        options={salonOptions}
        value={salon || null}
        onValueChange={(v) => onChange({ salon: v ?? '', branch: '' })}
      />
      {salon && branches.length > 0 ? (
        <Select
          label={t('branches.filter.branch')}
          value={branch}
          options={[{ value: '', label: t('branches.filter.all') }, ...branches]}
          onChange={(e) => onChange({ salon, branch: e.target.value })}
        />
      ) : null}
    </>
  );
}
