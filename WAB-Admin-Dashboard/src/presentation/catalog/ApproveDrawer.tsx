import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MAX_PAGE_SIZE } from '@/constants/ui';
import {
  APPROVE_MODES,
  MAX_DESCRIPTION,
  MAX_NAME,
  approveInputOf,
  approveProblems,
  type ApproveDraft,
  type ApproveField,
  type ApproveInput,
  type ApproveMode,
  type CatalogRequest,
} from '@/domain/catalog/catalog';
import { SegmentedControl } from '../components/form/SegmentedControl';
import { TextField } from '../components/form/TextField';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { reasonError, ResourceDrawer, Select } from '../components/overlay/ResourceDrawer';
import { useLanguage } from '../hooks/useLanguage';

export interface ApproveDrawerProps {
  item: CatalogRequest;
  saving: boolean;
  error: unknown;
  onSubmit: (input: ApproveInput, reason: string) => void;
  onClose: () => void;
}

/** Active catalog services of the salon's gender: the only ones the server accepts for a mapping (SRV-125). */
function useMapOptions(salonId: string, enabled: boolean) {
  const { repositories } = useContainer();
  const { language } = useLanguage();
  const salon = useQuery({
    queryKey: ['getSalonsById', salonId],
    queryFn: () => repositories.salons.get(salonId),
    enabled,
  });
  const gender = salon.data?.gender;
  const services = useQuery({
    queryKey: ['getCatalogServices', 'options', gender],
    queryFn: () => repositories.catalog.services.list({ page: 1, pageSize: MAX_PAGE_SIZE, gender }),
    enabled: enabled && gender !== undefined,
  });
  const options = (services.data?.items ?? [])
    .filter((s) => s.active)
    .map((s) => ({ value: s.id, label: s.name[language] }));
  return {
    gender,
    options,
    loading: enabled && (salon.isPending || services.isPending),
    error: salon.error ?? services.error,
  };
}

/** Approve a salon's request: create a new catalog service from it, or link it to an existing one. */
export function ApproveDrawer({ item, saving, error, onSubmit, onClose }: ApproveDrawerProps) {
  const { t } = useTranslation();
  // The salon wrote the text in one language: start both fields from it and let the admin translate.
  const [v, setV] = useState<ApproveDraft>({
    mode: 'create',
    nameAr: item.name,
    nameEn: item.name,
    descAr: item.description,
    descEn: item.description,
    catalogServiceId: '',
  });
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const map = useMapOptions(item.salonId, v.mode === 'map');
  // Until the admin picks one, the first matching service is the choice shown in the select.
  const draft = { ...v, catalogServiceId: v.catalogServiceId || (map.options[0]?.value ?? '') };
  const bad = approveProblems(draft);
  const err = (k: ApproveField, max?: number) =>
    tried && bad.has(k) ? t(`catalog.error.${k}`, { max }) : undefined;
  const submit = () => {
    setTried(true);
    if (bad.size > 0 || reasonError(reason)) return;
    onSubmit(approveInputOf(draft, item.imageKey), reason.trim());
  };
  const field = (k: 'nameAr' | 'nameEn' | 'descAr' | 'descEn', dir: 'rtl' | 'ltr', max: number) => (
    <TextField
      label={t(`catalog.${k}`)}
      dir={dir}
      value={v[k]}
      error={err(k, max)}
      onChange={(e) => setV({ ...v, [k]: e.target.value })}
    />
  );
  const audience = map.gender ? t(`catalog.genders.${map.gender}`) : '';
  return (
    <ResourceDrawer
      title={t('catalog.approveTitle')}
      reason={reason}
      reasonErr={tried ? reasonError(reason) : undefined}
      onReason={setReason}
      saving={saving}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <SegmentedControl<ApproveMode>
        ariaLabel={t('catalog.approveMode')}
        value={v.mode}
        options={APPROVE_MODES.map((m) => ({ value: m, label: t(`catalog.mode.${m}`) }))}
        onChange={(mode) => setV({ ...v, mode })}
      />
      {v.mode === 'create' ? (
        <>
          <p className="wab-field__hint">{t('catalog.approveHint', { name: item.name })}</p>
          {field('nameAr', 'rtl', MAX_NAME)}
          {field('nameEn', 'ltr', MAX_NAME)}
          {field('descAr', 'rtl', MAX_DESCRIPTION)}
          {field('descEn', 'ltr', MAX_DESCRIPTION)}
        </>
      ) : (
        <MapServiceField
          hint={t('catalog.mapHint', { name: item.name, audience })}
          map={map}
          value={draft.catalogServiceId}
          error={err('service')}
          onChange={(catalogServiceId) => setV({ ...v, catalogServiceId })}
        />
      )}
    </ResourceDrawer>
  );
}

function MapServiceField(p: {
  hint: string;
  map: ReturnType<typeof useMapOptions>;
  value: string;
  error: string | undefined;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { map } = p;
  const empty = !map.loading && !map.error && map.options.length === 0;
  return (
    <>
      <p className="wab-field__hint">{p.hint}</p>
      {map.error ? <InlineAlert error={map.error} /> : null}
      {map.loading ? <p className="wab-field__hint">{t('common.loading')}</p> : null}
      {empty ? <p className="wab-field__hint">{t('catalog.noMatches')}</p> : null}
      {map.options.length > 0 ? (
        <Select
          label={t('catalog.mapService')}
          value={p.value}
          options={map.options}
          error={p.error}
          onChange={(e) => p.onChange(e.target.value)}
        />
      ) : p.error ? (
        <p className="wab-field__error" role="alert">
          {p.error}
        </p>
      ) : null}
    </>
  );
}
