import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { CLOSURE_REASON_MAX, isClosureRange } from '@/domain/salonEdit/rules';
import type { Closure } from '@/domain/salonEdit/salonEdit';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { DateField } from '../components/form/DateField';
import { TextField } from '../components/form/TextField';
import { useReasonAction } from '../hooks/useReasonAction';
import { BrokenBookings } from './BrokenBookings';
import { useSalonMutation } from './useSalonMutation';

const REFRESH = [['getSalonsByIdHours']] as const;
const EMPTY = { from: '', to: '', text: '' };

function ClosureRows({
  closures,
  onEdit,
  onRemove,
}: {
  closures: readonly Closure[];
  onEdit: (c: Closure) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {closures.length === 0 ? <p>{t('salonEdit.noClosures')}</p> : null}
      <ul className="wab-stack">
        {closures.map((c) => (
          <li key={c.id} className="wab-row">
            <span dir="ltr">
              {c.from} → {c.to}
            </span>
            <span>{c.reason}</span>
            <Button size="sm" variant="secondary" disabled={!c.editable} onClick={() => onEdit(c)}>
              {t('salonEdit.edit')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={!c.editable}
              onClick={() => onRemove(c.id)}
            >
              {t('salonEdit.remove')}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Closure days (from-to, shown to customers): add, change (only future ones) and remove. */
export function ClosuresPanel({
  salonId,
  closures,
}: {
  salonId: string;
  closures: readonly Closure[];
}) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const edit = repositories.salonEdit;
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Closure | null>(null);
  const [tried, setTried] = useState(false);
  const done = () => {
    setForm(EMPTY);
    setEditing(null);
    setTried(false);
  };
  const preview = useMutation({
    mutationFn: () => edit.previewClosure(salonId, { from: form.from, to: form.to }),
  });
  const save = useSalonMutation(
    (r: string) =>
      editing
        ? edit.updateClosure(
            salonId,
            editing.id,
            { from: form.from, to: form.to, closureReason: form.text.trim() },
            r,
          )
        : edit.addClosure(
            salonId,
            { from: form.from, to: form.to, closureReason: form.text.trim() },
            r,
          ),
    REFRESH,
    done,
  );
  const remove = useSalonMutation(
    (v: { id: string; reason: string }) => edit.removeClosure(salonId, v.id, v.reason),
    REFRESH,
  );
  const reason = useReasonAction(save.isPending || remove.isPending);
  const rangeOk = isClosureRange(form.from, form.to);
  const textOk = form.text.trim().length > 0 && form.text.length <= CLOSURE_REASON_MAX;
  const change = (patch: Partial<typeof EMPTY>) => {
    preview.reset();
    setForm({ ...form, ...patch });
  };
  const startEdit = (c: Closure) => {
    setEditing(c);
    setForm({ from: c.from, to: c.to, text: c.reason });
  };
  const submit = () => {
    setTried(true);
    if (rangeOk && textOk) reason.ask((r) => save.mutate(r));
  };
  return (
    <Card aria-label={t('salonEdit.closures')}>
      <h2 className="wab-settings__title">{t('salonEdit.closures')}</h2>
      <div className="wab-stack">
        <ClosureRows
          closures={closures}
          onEdit={startEdit}
          onRemove={(id) => reason.ask((r) => remove.mutate({ id, reason: r }))}
        />
        <h3>{t(editing ? 'salonEdit.editClosure' : 'salonEdit.addClosure')}</h3>
        <div className="wab-settings__grid">
          <DateField
            label={t('salonEdit.from')}
            value={form.from}
            onValueChange={(from) => change({ from })}
            error={tried && !rangeOk ? t('salonEdit.error.range') : undefined}
          />
          <DateField
            label={t('salonEdit.to')}
            value={form.to}
            onValueChange={(to) => change({ to })}
          />
          <TextField
            label={t('salonEdit.closureText')}
            value={form.text}
            onChange={(e) => change({ text: e.target.value })}
            error={tried && !textOk ? t('salonEdit.error.closureText') : undefined}
          />
        </div>
        <BrokenBookings bookings={preview.data} />
        {(preview.error ?? save.error ?? remove.error) ? (
          <InlineAlert error={preview.error ?? save.error ?? remove.error} />
        ) : null}
        <div className="wab-row">
          <Button
            variant="secondary"
            loading={preview.isPending}
            disabled={!rangeOk}
            onClick={() => preview.mutate()}
          >
            {t('salonEdit.checkBookings')}
          </Button>
          <Button loading={save.isPending} onClick={submit}>
            {t(editing ? 'salonEdit.save' : 'salonEdit.addClosure')}
          </Button>
          {editing ? (
            <Button variant="ghost" onClick={done}>
              {t('common.cancel')}
            </Button>
          ) : null}
        </div>
      </div>
      {reason.dialog}
    </Card>
  );
}
