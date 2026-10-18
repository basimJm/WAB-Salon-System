import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { LANGUAGES } from '@/constants/i18n';
import {
  BANNER_ACTIONS,
  BANNER_GENDERS,
  type Banner,
  type BannerInput,
} from '@/domain/banners/banners';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { PageHeader } from '../components/core/PageHeader';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { SchedulePicker } from '../components/form/SchedulePicker';
import { Select } from '../components/form/Select';
import { TextField } from '../components/form/TextField';
import { Toggle } from '../components/form/Toggle';
import { LocalizedImageUploader } from '../components/media/LocalizedImageUploader';
import { PhonePreview } from '../components/media/PhonePreview';
import { useBannerForm } from './useBannerForm';

const pick = <T extends string>(all: readonly T[], v: string, fallback: T): T =>
  all.find((a) => a === v) ?? fallback;

export interface BannerEditorProps {
  item: Banner | null;
  saving: boolean;
  error: unknown;
  onSave: (value: BannerInput & { active: boolean }, reason: string) => void;
  onCancel: () => void;
}

/** Full-width banner form: artwork in both languages, action, audience, schedule (Amman days), order, active. */
export function BannerEditor({ item, saving, error, onSave, onCancel }: BannerEditorProps) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const { draft: d, patch, error: bad, tried, reasonBad, submit } = useBannerForm(item);
  const msg = (k: 'imageAr' | 'imageEn' | 'schedule' | 'actionValue' | 'order') =>
    bad(k) ? t(`banners.error.${k}`) : undefined;
  const imageError = msg('imageAr') ?? msg('imageEn');
  const save = () => {
    const ready = submit();
    if (ready) onSave(ready.value, ready.reason);
  };
  const upload = (file: File, onProgress: (r: number) => void) =>
    repositories.uploads
      .upload('BANNER_IMAGE', file, onProgress)
      .then((f) => ({ key: f.key, url: f.url ?? '' }));
  return (
    <div className="wab-page wab-stack">
      <PageHeader title={t(item ? 'banners.edit' : 'banners.add')} />
      <Card aria-label={t('banners.edit')}>
        <div className="wab-stack">
          <LocalizedImageUploader
            label={t('banners.image')}
            value={d.images}
            onChange={(images) => patch({ images })}
            upload={upload}
          />
          {imageError ? (
            <p className="wab-field__error" role="alert">
              {imageError}
            </p>
          ) : null}
          <div className="wab-row">
            <Select
              label={t('banners.action')}
              value={d.action}
              options={BANNER_ACTIONS.map((v) => ({ value: v, label: t(`banners.actions.${v}`) }))}
              onChange={(e) => patch({ action: pick(BANNER_ACTIONS, e.target.value, d.action) })}
            />
            {d.action === 'NONE' ? null : (
              <TextField
                label={t(`banners.value.${d.action}`)}
                dir="ltr"
                value={d.actionValue}
                error={msg('actionValue')}
                onChange={(e) => patch({ actionValue: e.target.value })}
              />
            )}
            <Select
              label={t('banners.gender')}
              value={d.gender}
              options={BANNER_GENDERS.map((v) => ({ value: v, label: t(`banners.genders.${v}`) }))}
              onChange={(e) => patch({ gender: pick(BANNER_GENDERS, e.target.value, d.gender) })}
            />
          </div>
          <SchedulePicker
            startLabel={t('banners.start')}
            endLabel={t('banners.end')}
            value={d.schedule}
            onChange={(schedule) => patch({ schedule })}
          />
          {msg('schedule') ? (
            <p className="wab-field__error" role="alert">
              {msg('schedule')}
            </p>
          ) : null}
          <TextField
            label={t('banners.order')}
            inputMode="numeric"
            dir="ltr"
            value={d.order}
            error={msg('order')}
            onChange={(e) => patch({ order: e.target.value })}
          />
          <Toggle
            kind="switch"
            label={t('banners.active')}
            checked={d.active}
            onChange={(e) => patch({ active: e.target.checked })}
          />
          <div className="wab-row">
            {LANGUAGES.map((language) => {
              const url = d.images[language]?.url;
              return (
                <PhonePreview
                  key={language}
                  language={language}
                  label={t(`banners.preview.${language}`)}
                >
                  {url ? (
                    <img src={url} alt="" className="wab-banner-preview" />
                  ) : (
                    <span>{t('banners.noImage')}</span>
                  )}
                </PhonePreview>
              );
            })}
          </div>
          <TextField
            label={t('appConfig.reason')}
            hint={t('appConfig.reasonHint')}
            value={d.reason}
            error={tried && reasonBad ? t('appConfig.error.reason') : undefined}
            onChange={(e) => patch({ reason: e.target.value })}
          />
          {error ? <InlineAlert error={error} /> : null}
          <div className="wab-row">
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              {t('form.cancel')}
            </Button>
            <Button loading={saving} onClick={save}>
              {t('form.save')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
