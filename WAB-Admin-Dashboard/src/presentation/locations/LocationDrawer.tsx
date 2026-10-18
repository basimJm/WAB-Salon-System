import type { ReactNode, SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/core/Button';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { TextField } from '../components/form/TextField';
import { Toggle } from '../components/form/Toggle';
import { Drawer } from '../components/overlay/Drawer';
import type { useLocationForm } from './useLocationForm';

export interface LocationDrawerProps {
  open: boolean;
  title: string;
  form: ReturnType<typeof useLocationForm>;
  /** Fields only this kind has (code, dial code, parent...), shown between the names and the sort order. */
  children?: ReactNode;
  saving: boolean;
  error: unknown;
  onSubmit: () => void;
  onClose: () => void;
}

/** Edit/create panel shared by countries, cities and areas: names in both languages, order, active, reason. */
export function LocationDrawer({
  open,
  title,
  form,
  children,
  saving,
  error,
  onSubmit,
  onClose,
}: LocationDrawerProps) {
  const { t } = useTranslation();
  const { values, errors, set } = form;
  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    onSubmit();
  };
  const msg = (key: string | undefined) => (key ? t(key) : undefined);
  return (
    <Drawer open={open} title={title} onClose={onClose}>
      <form className="wab-drawer-form" onSubmit={submit} noValidate>
        <TextField
          label={t('locations.nameAr')}
          lang="ar"
          dir="rtl"
          value={values.nameAr}
          error={msg(errors.nameAr)}
          onChange={(e) => set('nameAr', e.target.value)}
        />
        <TextField
          label={t('locations.nameEn')}
          lang="en"
          dir="ltr"
          value={values.nameEn}
          error={msg(errors.nameEn)}
          onChange={(e) => set('nameEn', e.target.value)}
        />
        {children}
        <TextField
          label={t('locations.sortOrder')}
          inputMode="numeric"
          dir="ltr"
          value={values.sortOrder}
          error={msg(errors.sortOrder)}
          onChange={(e) => set('sortOrder', e.target.value)}
        />
        <Toggle
          kind="switch"
          label={t('locations.active')}
          checked={values.active}
          onChange={(e) => set('active', e.target.checked)}
        />
        <TextField
          label={t('locations.reason')}
          hint={t('locations.reasonHint')}
          value={values.reason}
          error={msg(errors.reason)}
          onChange={(e) => set('reason', e.target.value)}
        />
        {error ? <InlineAlert error={error} /> : null}
        <div className="wab-row wab-drawer-form__actions">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('form.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {t('form.save')}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
