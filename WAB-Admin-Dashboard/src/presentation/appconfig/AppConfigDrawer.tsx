import type { ReactNode, SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MIN_REASON_LENGTH } from '@/constants/ui';
import { APP_KINDS, PLATFORMS } from '@/domain/appconfig/appConfig';
import { Button } from '../components/core/Button';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { Select } from '../components/form/Select';
import { TextField } from '../components/form/TextField';
import { Drawer } from '../components/overlay/Drawer';

export const appOptions = (t: (k: string) => string) =>
  APP_KINDS.map((value) => ({ value, label: t(`appConfig.app.${value}`) }));
export const platformOptions = (t: (k: string) => string) =>
  PLATFORMS.map((value) => ({ value, label: t(`appConfig.platform.${value}`) }));

/** Reason rule shared by every audited form of this module. */
export const reasonError = (reason: string): string | undefined =>
  reason.trim().length < MIN_REASON_LENGTH ? 'appConfig.error.reason' : undefined;

export interface AppConfigDrawerProps {
  title: string;
  children: ReactNode;
  reason: string;
  reasonErr: string | undefined;
  onReason: (value: string) => void;
  saving: boolean;
  error: unknown;
  onSubmit: () => void;
  onClose: () => void;
}

/** Side panel shell: the form fields, the mandatory reason, the save error and the buttons. */
export function AppConfigDrawer(p: AppConfigDrawerProps) {
  const { t } = useTranslation();
  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    p.onSubmit();
  };
  return (
    <Drawer open title={p.title} onClose={p.onClose}>
      <form className="wab-drawer-form" onSubmit={submit} noValidate>
        {p.children}
        <TextField
          label={t('appConfig.reason')}
          hint={t('appConfig.reasonHint')}
          value={p.reason}
          error={p.reasonErr ? t(p.reasonErr) : undefined}
          onChange={(e) => p.onReason(e.target.value)}
        />
        {p.error ? <InlineAlert error={p.error} /> : null}
        <div className="wab-row wab-drawer-form__actions">
          <Button variant="secondary" onClick={p.onClose} disabled={p.saving}>
            {t('form.cancel')}
          </Button>
          <Button type="submit" loading={p.saving}>
            {t('form.save')}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

export { Select };
