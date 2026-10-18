import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MAX_PAGE_SIZE } from '@/constants/ui';
import {
  AUDIENCE_KINDS,
  parseIds,
  type Audience,
  type AudienceKind,
} from '@/domain/campaigns/campaigns';
import { SALON_GENDERS } from '@/domain/salons/salons';
import { Select } from '../components/form/Select';
import { TextField } from '../components/form/TextField';
import { useLocationOptions } from '../hooks/useLocationOptions';

const pick = <T extends string>(all: readonly T[], v: string): T | undefined =>
  all.find((a) => a === v);

/** Fields that describe who receives the campaign; only the ones the chosen kind needs are shown. */
export function AudienceFields({
  value,
  onChange,
  error,
}: {
  value: Audience;
  onChange: (a: Audience) => void;
  error?: string | undefined;
}) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const cities = useLocationOptions('cities');
  const salons = useQuery({
    queryKey: ['getSalons', 'campaign-options'],
    queryFn: () => repositories.salons.list({ page: 1, pageSize: MAX_PAGE_SIZE, state: 'LIVE' }),
    enabled: value.kind === 'SALON_MEMBERS',
  });
  const kind = (k: AudienceKind): Audience => ({ kind: k });
  return (
    <div className="wab-stack">
      <Select
        label={t('campaigns.audience')}
        value={value.kind}
        options={AUDIENCE_KINDS.map((k) => ({ value: k, label: t(`campaigns.kinds.${k}`) }))}
        onChange={(e) => onChange(kind(pick(AUDIENCE_KINDS, e.target.value) ?? value.kind))}
      />
      {value.kind === 'GENDER' ? (
        <Select
          label={t('salons.gender')}
          value={value.gender ?? ''}
          options={[
            { value: '', label: t('campaigns.choose') },
            ...SALON_GENDERS.map((g) => ({ value: g, label: t(`catalog.genders.${g}`) })),
          ]}
          onChange={(e) =>
            onChange({
              kind: 'GENDER',
              ...(pick(SALON_GENDERS, e.target.value)
                ? { gender: pick(SALON_GENDERS, e.target.value) }
                : {}),
            })
          }
        />
      ) : null}
      {value.kind === 'CITY' ? (
        <Select
          label={t('salons.city')}
          value={value.cityIds?.[0] ?? ''}
          options={[{ value: '', label: t('campaigns.choose') }, ...cities]}
          onChange={(e) =>
            onChange({ kind: 'CITY', ...(e.target.value ? { cityIds: [e.target.value] } : {}) })
          }
        />
      ) : null}
      {value.kind === 'SALON_MEMBERS' ? (
        <Select
          label={t('placements.salon')}
          value={value.salonId ?? ''}
          options={[
            { value: '', label: t('campaigns.choose') },
            ...(salons.data?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
          ]}
          onChange={(e) =>
            onChange({
              kind: 'SALON_MEMBERS',
              ...(e.target.value ? { salonId: e.target.value } : {}),
            })
          }
        />
      ) : null}
      {value.kind === 'SPECIFIC_USERS' ? (
        <TextField
          label={t('campaigns.customerIds')}
          hint={t('campaigns.customerIdsHint')}
          dir="ltr"
          value={(value.customerIds ?? []).join(', ')}
          onChange={(e) =>
            onChange({ kind: 'SPECIFIC_USERS', customerIds: parseIds(e.target.value) })
          }
        />
      ) : null}
      {error ? (
        <p className="wab-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
