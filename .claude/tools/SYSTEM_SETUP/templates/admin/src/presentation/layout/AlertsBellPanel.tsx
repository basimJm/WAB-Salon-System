import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { BELL_LATEST_ALERTS } from '@/constants/ui';
import { ROUTES } from '@/constants/routes';
import { STATUS_TONES } from '@/constants/status';
import { alertLink, alertTitle, type Alert } from '@/domain/alerts/alerts';
import { formatRelative } from '@/domain/shared/relativeTime';
import { Icon } from '../components/core/Icon';
import { Spinner } from '../components/feedback/Spinner';
import { useLanguage } from '../hooks/useLanguage';

function BellRow({ alert, onDone }: { alert: Alert; onDone: () => void }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const read = useMutation({
    mutationFn: () => repositories.alerts.acknowledge(alert.id),
    // The bell, the list and the badge all read alerts (key[0] is the operation id).
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['getAlerts'] });
      await queryClient.invalidateQueries({ queryKey: ['getAlertsCount'] });
    },
  });
  const to = alertLink(alert) ?? ROUTES.alerts;
  const title = alertTitle(alert, language);
  return (
    <li className="app-bell__row">
      <span
        className={`app-bell__dot app-bell__dot--${STATUS_TONES.alertSeverity[alert.severity]}`}
        aria-hidden="true"
      />
      <RouterLink className="app-bell__link" to={to} onClick={onDone}>
        <span className="app-bell__title">{title}</span>
        <span className="app-bell__sub">
          {t(`status.alertSeverity.${alert.severity}`)} ·{' '}
          {formatRelative(alert.createdAt, new Date(), language)}
        </span>
      </RouterLink>
      <button
        type="button"
        className="app-bell__read"
        aria-label={`${t('topbar.markRead')}: ${title}`}
        title={t('topbar.markRead')}
        disabled={read.isPending}
        onClick={() => read.mutate()}
      >
        <Icon name="check" size="sm" />
      </button>
    </li>
  );
}

/** Latest alerts still NEW, loaded when the panel opens (its own chunk: not part of the entry bundle). */
export default function BellPanel({ close }: { close: () => void }) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const latest = useQuery({
    queryKey: ['getAlerts', 'bell'],
    queryFn: () =>
      repositories.alerts.list({ page: 1, pageSize: BELL_LATEST_ALERTS, status: 'NEW' }),
  });
  const items = latest.data?.items ?? [];
  return (
    <div className="app-bell">
      <div className="app-bell__head">
        <span className="app-bell__heading">{t('topbar.alerts')}</span>
        <RouterLink className="app-bell__all" to={ROUTES.alerts} onClick={close}>
          {t('topbar.viewAll')}
        </RouterLink>
      </div>
      {latest.isPending ? <Spinner /> : null}
      {latest.isError ? (
        <p className="app-bell__note" role="alert">
          {t('topbar.alertsFailed')}{' '}
          <button type="button" className="app-bell__retry" onClick={() => void latest.refetch()}>
            {t('common.retry')}
          </button>
        </p>
      ) : null}
      {latest.isSuccess && items.length === 0 ? (
        <p className="app-bell__note">{t('topbar.noAlerts')}</p>
      ) : null}
      {items.length > 0 ? (
        <ul className="app-bell__list">
          {items.map((a) => (
            <BellRow key={a.id} alert={a} onDone={close} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
