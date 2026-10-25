import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { scheduleProblems } from '@/domain/salonEdit/rules';
import type { BranchScope, ScheduleDay } from '@/domain/salonEdit/salonEdit';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { AsyncView } from '../components/feedback/AsyncView';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { Skeleton } from '../components/feedback/Skeleton';
import { TextField } from '../components/form/TextField';
import { Toggle } from '../components/form/Toggle';
import { useReasonAction } from '../hooks/useReasonAction';
import { BrokenBookings } from './BrokenBookings';
import { ClosuresPanel } from './ClosuresPanel';
import { useSalonMutation } from './useSalonMutation';

function WeeklyHours({ scope, initial }: { scope: BranchScope; initial: readonly ScheduleDay[] }) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const [days, setDays] = useState<readonly ScheduleDay[]>(initial);
  const [tried, setTried] = useState(false);
  const preview = useMutation({
    mutationFn: () => repositories.salonEdit.previewHours(scope, days),
  });
  const save = useSalonMutation(
    (reason: string) => repositories.salonEdit.saveHours(scope, days, reason),
    [['getSalonsByIdHours']],
  );
  const reason = useReasonAction(save.isPending);
  const bad = new Set(scheduleProblems(days));
  const set = (day: string, change: Partial<ScheduleDay>) => {
    preview.reset();
    setDays(days.map((d) => (d.day === day ? { ...d, ...change } : d)));
  };
  const submit = () => {
    setTried(true);
    if (bad.size === 0) reason.ask((r) => save.mutate(r));
  };
  return (
    <Card aria-label={t('salonEdit.weekly')}>
      <h2 className="wab-settings__title">{t('salonEdit.weekly')}</h2>
      <div className="wab-stack">
        {days.map((d) => (
          <div key={d.day} className="wab-row">
            <strong>{t(`salonEdit.day.${d.day}`)}</strong>
            <Toggle
              kind="switch"
              label={t('salonEdit.isOpen')}
              checked={!d.isOff}
              onChange={(e) => set(d.day, { isOff: !e.target.checked })}
            />
            <TextField
              label={t('salonEdit.from')}
              type="time"
              dir="ltr"
              disabled={d.isOff}
              value={d.open}
              onChange={(e) => set(d.day, { open: e.target.value })}
              error={tried && bad.has(d.day) ? t('salonEdit.error.hours') : undefined}
            />
            <TextField
              label={t('salonEdit.to')}
              type="time"
              dir="ltr"
              disabled={d.isOff}
              value={d.close}
              onChange={(e) => set(d.day, { close: e.target.value })}
            />
          </div>
        ))}
        <BrokenBookings bookings={preview.data} />
        {(preview.error ?? save.error) ? <InlineAlert error={preview.error ?? save.error} /> : null}
        <div className="wab-row">
          <Button
            variant="secondary"
            loading={preview.isPending}
            disabled={bad.size > 0}
            onClick={() => preview.mutate()}
          >
            {t('salonEdit.checkBookings')}
          </Button>
          <Button loading={save.isPending} onClick={submit}>
            {t('salonEdit.save')}
          </Button>
        </div>
      </div>
      {reason.dialog}
    </Card>
  );
}

export function HoursTab({ scope }: { scope: BranchScope }) {
  const { repositories } = useContainer();
  const q = useQuery({
    queryKey: ['getSalonsByIdHours', scope],
    queryFn: () => repositories.salonEdit.hours(scope),
  });
  return (
    <AsyncView
      loading={q.isPending}
      error={q.error}
      onRetry={() => void q.refetch()}
      skeleton={<Skeleton height="lg" />}
    >
      {q.data ? (
        <div className="wab-stack">
          <WeeklyHours key={q.dataUpdatedAt} scope={scope} initial={q.data.weeklySchedule} />
          <ClosuresPanel scope={scope} closures={q.data.closures} />
        </div>
      ) : null}
    </AsyncView>
  );
}
