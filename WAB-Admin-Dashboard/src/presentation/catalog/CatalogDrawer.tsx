import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  MAX_DESCRIPTION,
  MAX_NAME,
  validateCatalogForm,
  type CatalogService,
  type CatalogServiceInput,
} from '@/domain/catalog/catalog';
import { type BusinessKind } from '@/domain/shared/businessType';
import { TextField } from '../components/form/TextField';
import { Toggle } from '../components/form/Toggle';
import { ImageUploader, type UploadedImage } from '../components/media/ImageUploader';
import { reasonError, ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { BusinessKindFields } from './BusinessKindFields';

const BLANK = {
  nameAr: '',
  nameEn: '',
  descAr: '',
  descEn: '',
  sortOrder: '0',
  active: true,
  reason: '',
};

function initial(item: CatalogService | null, kind: BusinessKind) {
  if (!item) return { ...BLANK, ...kind, image: null as UploadedImage | null };
  return {
    businessType: item.businessType,
    audience: item.audience,
    nameAr: item.name.ar,
    nameEn: item.name.en,
    descAr: item.description.ar,
    descEn: item.description.en,
    image: item.imageKey ? { key: item.imageKey, url: '' } : null,
    sortOrder: String(item.sortOrder),
    active: item.active,
    reason: '',
  };
}

export interface CatalogDrawerProps {
  item: CatalogService | null;
  /** Type + audience a new service starts with (the list's current filter). */
  kind: BusinessKind;
  saving: boolean;
  error: unknown;
  onSubmit: (value: CatalogServiceInput, reason: string) => void;
  onClose: () => void;
}

/** Create/edit panel of one catalog service: names and descriptions in both languages, artwork, order, active. */
export function CatalogDrawer({
  item,
  kind,
  saving,
  error,
  onSubmit,
  onClose,
}: CatalogDrawerProps) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const [v, setV] = useState(() => initial(item, kind));
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const submit = () => {
    const found = new Set<string>(validateCatalogForm({ ...v, imageKey: v.image?.key ?? '' }));
    if (reasonError(v.reason)) found.add('reason');
    setBad(found);
    if (found.size > 0) return;
    onSubmit(
      {
        name: { ar: v.nameAr.trim(), en: v.nameEn.trim() },
        description: { ar: v.descAr.trim(), en: v.descEn.trim() },
        imageKey: v.image?.key ?? '',
        businessType: v.businessType,
        audience: v.audience,
        active: v.active,
        sortOrder: Number(v.sortOrder),
      },
      v.reason.trim(),
    );
  };
  const e = (k: string, max?: number) =>
    bad.has(k) ? t(`catalog.error.${k}`, { max }) : undefined;
  const text = (k: 'nameAr' | 'nameEn' | 'descAr' | 'descEn', dir: 'rtl' | 'ltr', max: number) => (
    <TextField
      label={t(`catalog.${k}`)}
      dir={dir}
      value={v[k]}
      error={e(k, max)}
      onChange={(ev) => setV({ ...v, [k]: ev.target.value })}
    />
  );
  const upload = (file: File, onProgress: (r: number) => void) =>
    repositories.uploads
      .upload('CATALOG_IMAGE', file, onProgress)
      .then((f) => ({ key: f.key, url: f.url ?? '' }));
  return (
    <ResourceDrawer
      title={t(item ? 'catalog.edit' : 'catalog.add')}
      reason={v.reason}
      reasonErr={bad.has('reason') ? 'appConfig.error.reason' : undefined}
      onReason={(reason) => setV({ ...v, reason })}
      saving={saving}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <BusinessKindFields
        value={{ businessType: v.businessType, audience: v.audience }}
        locked={item !== null}
        onChange={(next) => setV({ ...v, ...next })}
      />
      {text('nameAr', 'rtl', MAX_NAME)}
      {text('nameEn', 'ltr', MAX_NAME)}
      {text('descAr', 'rtl', MAX_DESCRIPTION)}
      {text('descEn', 'ltr', MAX_DESCRIPTION)}
      <ImageUploader
        label={t('catalog.image')}
        value={v.image}
        onChange={(image) => setV({ ...v, image })}
        upload={upload}
      />
      {bad.has('image') ? (
        <p className="wab-field__error" role="alert">
          {t('catalog.error.image')}
        </p>
      ) : null}
      <TextField
        label={t('catalog.order')}
        inputMode="numeric"
        dir="ltr"
        value={v.sortOrder}
        error={e('order')}
        onChange={(ev) => setV({ ...v, sortOrder: ev.target.value })}
      />
      <Toggle
        kind="switch"
        label={t('catalog.active')}
        checked={v.active}
        onChange={(ev) => setV({ ...v, active: ev.target.checked })}
      />
      {item?.active && !v.active ? (
        <p className="wab-field__hint" role="status">
          {t('catalog.deactivateWarning')}
        </p>
      ) : null}
    </ResourceDrawer>
  );
}
