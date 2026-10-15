import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_KINDS, type AppKind } from '@/domain/appconfig/appConfig';
import {
  PAGE_KINDS,
  validateBody,
  type ContentPage,
  type PageKind,
} from '@/domain/content/content';
import { MIN_REASON_LENGTH } from '@/constants/ui';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { PageHeader } from '../components/core/PageHeader';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { LocalizedRichTextEditor } from '../components/form/LocalizedRichTextEditor';
import { Select } from '../components/form/Select';
import { TextField } from '../components/form/TextField';

export interface PageEditorProps {
  item: ContentPage | null;
  saving: boolean;
  error: unknown;
  onSave: (
    value: { app: AppKind; kind: PageKind; body: { ar: string; en: string } },
    reason: string,
  ) => void;
  onCancel: () => void;
}

const pick = <T extends string>(all: readonly T[], v: string, fallback: T): T =>
  all.find((a) => a === v) ?? fallback;

/** Full-width editor of one legal page: app and kind are chosen once, the text is edited in both languages. */
export function PageEditor({ item, saving, error, onSave, onCancel }: PageEditorProps) {
  const { t } = useTranslation();
  const [app, setApp] = useState<AppKind>(item?.app ?? APP_KINDS[0]);
  const [kind, setKind] = useState<PageKind>(item?.kind ?? PAGE_KINDS[0]);
  const [body, setBody] = useState(item?.body ?? { ar: '', en: '' });
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const badLanguages = validateBody(body);
  const reasonBad = reason.trim().length < MIN_REASON_LENGTH;
  const submit = () => {
    setTried(true);
    if (badLanguages.length === 0 && !reasonBad) onSave({ app, kind, body }, reason.trim());
  };
  const bodyError = t('content.error.body');
  return (
    <div className="wab-page wab-stack">
      <PageHeader title={t(item ? 'content.editPage' : 'content.addPage')} />
      <Card aria-label={t('content.editPage')}>
        <div className="wab-stack">
          <div className="wab-row">
            <Select
              label={t('appConfig.appLabel')}
              disabled={item !== null}
              value={app}
              options={APP_KINDS.map((v) => ({ value: v, label: t(`appConfig.app.${v}`) }))}
              onChange={(e) => setApp(pick(APP_KINDS, e.target.value, app))}
            />
            <Select
              label={t('content.kind')}
              disabled={item !== null}
              value={kind}
              options={PAGE_KINDS.map((v) => ({ value: v, label: t(`content.kinds.${v}`) }))}
              onChange={(e) => setKind(pick(PAGE_KINDS, e.target.value, kind))}
            />
          </div>
          <LocalizedRichTextEditor
            label={t('content.body')}
            value={body}
            onChange={setBody}
            errors={tried ? Object.fromEntries(badLanguages.map((l) => [l, bodyError])) : {}}
          />
          <TextField
            label={t('appConfig.reason')}
            hint={t('appConfig.reasonHint')}
            value={reason}
            error={tried && reasonBad ? t('appConfig.error.reason') : undefined}
            onChange={(e) => setReason(e.target.value)}
          />
          {error ? <InlineAlert error={error} /> : null}
          <div className="wab-row">
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              {t('form.cancel')}
            </Button>
            <Button loading={saving} onClick={submit}>
              {t('form.save')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
