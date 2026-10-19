import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NewService, SalonService, ServicePatch } from '@/domain/salonEdit/salonEdit';
import {
  newServiceOf,
  servicePatchOf,
  serviceDraftOf,
  serviceProblems,
  type ServiceField,
} from '@/domain/salonEdit/serviceDraft';
import { JodField } from '../components/form/JodField';
import { NumberField } from '../components/form/NumberField';
import { Select } from '../components/form/Select';
import { TextArea } from '../components/form/TextArea';
import { Toggle } from '../components/form/Toggle';
import { ResourceDrawer, reasonError } from '../components/overlay/ResourceDrawer';

export interface CatalogOption {
  readonly value: string;
  readonly label: string;
}

export interface ServiceDrawerProps {
  /** The service being changed; `null` = a new one from the catalog. */
  service: SalonService | null;
  catalog: readonly CatalogOption[];
  /** Bride-only services exist for women's salons only. */
  allowBride: boolean;
  saving: boolean;
  error: unknown;
  onCreate: (input: NewService, reason: string) => void;
  onUpdate: (patch: ServicePatch, reason: string) => void;
  onClose: () => void;
}

/** Add a catalog service to the salon's menu or change its price, duration, visibility. */
export function ServiceDrawer(p: ServiceDrawerProps) {
  const { t } = useTranslation();
  const s = p.service;
  const [v, setV] = useState(() => serviceDraftOf(s, p.catalog[0]?.value ?? ''));
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const bad = serviceProblems(v);
  const err = (k: ServiceField) =>
    tried && bad.has(k) ? t(`salonEdit.error.service.${k}`) : undefined;
  const submit = () => {
    setTried(true);
    if (bad.size > 0 || reasonError(reason)) return;
    if (s) p.onUpdate(servicePatchOf(v), reason.trim());
    else p.onCreate(newServiceOf(v), reason.trim());
  };
  return (
    <ResourceDrawer
      title={t(s ? 'salonEdit.editService' : 'salonEdit.addService')}
      reason={reason}
      reasonErr={tried ? reasonError(reason) : undefined}
      onReason={setReason}
      saving={p.saving}
      error={p.error}
      onSubmit={submit}
      onClose={p.onClose}
    >
      {s ? (
        <p>{s.name}</p>
      ) : (
        <Select
          label={t('salonEdit.catalogService')}
          value={v.catalogServiceId}
          options={p.catalog}
          error={err('catalog')}
          onChange={(e) => setV({ ...v, catalogServiceId: e.target.value })}
        />
      )}
      <JodField
        label={t('salonEdit.price')}
        currencyLabel={t('common.currency')}
        value={v.price}
        error={err('price')}
        onValueChange={(price) => setV({ ...v, price })}
      />
      <NumberField
        label={t('salonEdit.minutes')}
        value={v.minutes}
        decimals={0}
        error={err('minutes')}
        onValueChange={(minutes) => setV({ ...v, minutes })}
      />
      {p.allowBride ? (
        <Toggle
          label={t('salonEdit.brideOnly')}
          checked={v.brideOnly}
          onChange={(e) => setV({ ...v, brideOnly: e.target.checked })}
        />
      ) : null}
      <Toggle
        kind="switch"
        label={t('salonEdit.active')}
        checked={v.active}
        onChange={(e) => setV({ ...v, active: e.target.checked })}
      />
      <TextArea
        label={t('salonEdit.extra')}
        rows={3}
        value={v.extra}
        error={err('extra')}
        onChange={(e) => setV({ ...v, extra: e.target.value })}
      />
    </ResourceDrawer>
  );
}
