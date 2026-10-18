import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { LANGUAGES } from '@/constants/i18n';
import { APP_KINDS } from '@/domain/appconfig/appConfig';
import {
  audienceValid,
  MAX_BODY,
  MAX_TITLE,
  type CampaignInput,
} from '@/domain/campaigns/campaigns';
import { formatNumber } from '@/domain/shared/format';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { PageHeader } from '../components/core/PageHeader';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { DateField } from '../components/form/DateField';
import { Select } from '../components/form/Select';
import { TextField } from '../components/form/TextField';
import { PhonePreview } from '../components/media/PhonePreview';
import { useLanguage } from '../hooks/useLanguage';
import { AudienceFields } from './AudienceFields';
import { useCampaignForm } from './useCampaignForm';

export interface CampaignEditorProps {
  saving: boolean;
  error: unknown;
  onSend: (input: CampaignInput, reason: string) => void;
  onCancel: () => void;
}

/** Compose a push: texts in both languages, app, audience with an estimate, link, now or scheduled, phone preview. */
export function CampaignEditor({ saving, error, onSend, onCancel }: CampaignEditorProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const { draft: d, patch, error: bad, tried, reasonBad, submit } = useCampaignForm();
  const ready = audienceValid(d.audience);
  const size = useQuery({
    queryKey: ['audienceSize', d.app, d.audience],
    queryFn: () => repositories.campaigns.audienceSize(d.app, d.audience),
    enabled: ready,
  });
  const msg = (k: Parameters<typeof bad>[0], max?: number) =>
    bad(k) ? t(`campaigns.error.${k}`, { max }) : undefined;
  const send = () => {
    const out = submit();
    if (out) onSend(out.input, out.reason);
  };
  const text = (
    k: 'titleAr' | 'titleEn' | 'bodyAr' | 'bodyEn',
    dir: 'rtl' | 'ltr',
    max: number,
  ) => (
    <TextField
      label={t(`campaigns.${k}`)}
      dir={dir}
      value={d[k]}
      error={msg(k, max)}
      onChange={(e) => patch({ [k]: e.target.value })}
    />
  );
  return (
    <div className="wab-page wab-stack">
      <PageHeader title={t('campaigns.compose')} />
      <Card aria-label={t('campaigns.compose')}>
        <div className="wab-stack">
          <Select
            label={t('appConfig.appLabel')}
            value={d.app}
            options={APP_KINDS.map((a) => ({ value: a, label: t(`appConfig.app.${a}`) }))}
            onChange={(e) => patch({ app: APP_KINDS.find((a) => a === e.target.value) ?? d.app })}
          />
          {text('titleAr', 'rtl', MAX_TITLE)}
          {text('titleEn', 'ltr', MAX_TITLE)}
          {text('bodyAr', 'rtl', MAX_BODY)}
          {text('bodyEn', 'ltr', MAX_BODY)}
          <TextField
            label={t('campaigns.link')}
            hint={t('campaigns.linkHint')}
            dir="ltr"
            value={d.link}
            error={msg('link')}
            onChange={(e) => patch({ link: e.target.value.trim() })}
          />
          <AudienceFields
            value={d.audience}
            onChange={(audience) => patch({ audience })}
            error={msg('audience')}
          />
          {size.data !== undefined ? (
            <p role="status">
              {t('campaigns.audienceSize', { count: formatNumber(size.data, language) })}
            </p>
          ) : null}
          <div className="wab-row">
            <DateField
              label={t('campaigns.sendDay')}
              hint={t('campaigns.sendNowHint')}
              value={d.day}
              onValueChange={(day) => patch({ day })}
              error={msg('schedule')}
            />
            <TextField
              label={t('campaigns.sendTime')}
              placeholder={t('campaigns.timePlaceholder')}
              dir="ltr"
              value={d.time}
              onChange={(e) => patch({ time: e.target.value })}
            />
          </div>
          <div className="wab-row">
            {LANGUAGES.map((l) => (
              <PhonePreview key={l} language={l} label={t(`campaigns.preview.${l}`)}>
                <strong>{l === 'ar' ? d.titleAr : d.titleEn}</strong>
                <p>{l === 'ar' ? d.bodyAr : d.bodyEn}</p>
              </PhonePreview>
            ))}
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
            <Button loading={saving} onClick={send}>
              {t(d.day ? 'campaigns.schedule' : 'campaigns.sendNow')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
