import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import {
  ALERT_KINDS,
  ALERT_STATUSES,
  alertLink,
  alertTitle,
  type Alert,
} from '@/domain/alerts/alerts';
import { formatInstant } from '@/domain/shared/format';
import { Button } from '../components/core/Button';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';

const OPTIONS = { filterKeys: ['status', 'kind'] };

/** Admin PRD A27 · Alerts, newest first: severity, kind, link to the subject, acknowledge. */
export default function AlertsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const status = ALERT_STATUSES.find((s) => s === state.filters['status']?.[0]);
  const kind = ALERT_KINDS.find((k) => k === state.filters['kind']?.[0]);
  const query = useQuery({
    queryKey: ['getAlerts', state],
    queryFn: () =>
      repositories.alerts.list({
        page: state.page,
        pageSize: state.pageSize,
        ...(status ? { status } : {}),
        ...(kind ? { kind } : {}),
      }),
  });
  const ack = useMutation({
    mutationFn: (id: string) => repositories.alerts.acknowledge(id),
    // The list and the bell badge both depend on it (key[0] is the operation id).
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['getAlerts'] });
      await queryClient.invalidateQueries({ queryKey: ['getAlertsCount'] });
    },
  });
  const title = t('nav.alerts');
  const columns: Column<Alert>[] = [
    {
      key: 'severity',
      header: t('alerts.severity'),
      render: (r) => <StatusBadge kind="alertSeverity" value={r.severity} />,
    },
    { key: 'kind', header: t('alerts.kind'), render: (r) => t(`alerts.kinds.${r.kind}`) },
    {
      key: 'title',
      header: t('alerts.what'),
      render: (r) => {
        const to = alertLink(r);
        const text = alertTitle(r, language);
        return to ? <RouterLink to={to}>{text}</RouterLink> : text;
      },
    },
    {
      key: 'at',
      header: t('transactions.at'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="alert" value={r.status} />,
    },
  ];
  const all = { value: '', label: t('appConfig.all') };
  const data = query.data;
  return (
    <ListPage
      title={title}
      subtitle={t('alerts.subtitle')}
      filters={{
        active: [
          ...(status
            ? [
                {
                  key: 'status',
                  label: `${t('salons.state')}: ${t(`status.alert.${status}`)}`,
                  onRemove: () => list.setFilter('status', []),
                },
              ]
            : []),
          ...(kind
            ? [
                {
                  key: 'kind',
                  label: `${t('alerts.kind')}: ${t(`alerts.kinds.${kind}`)}`,
                  onRemove: () => list.setFilter('kind', []),
                },
              ]
            : []),
        ],
        onClearAll: list.clearFilters,
        controls: (
          <>
            <Select
              label={t('salons.state')}
              value={status ?? ''}
              options={[
                all,
                ...ALERT_STATUSES.map((s) => ({ value: s, label: t(`status.alert.${s}`) })),
              ]}
              onChange={(e) => list.setFilter('status', e.target.value ? [e.target.value] : [])}
            />
            <Select
              label={t('alerts.kind')}
              value={kind ?? ''}
              options={[
                all,
                ...ALERT_KINDS.map((k) => ({ value: k, label: t(`alerts.kinds.${k}`) })),
              ]}
              onChange={(e) => list.setFilter('kind', e.target.value ? [e.target.value] : [])}
            />
          </>
        ),
      }}
      table={{
        columns,
        rows: data?.items ?? [],
        rowKey: (r) => r.id,
        caption: title,
        loading: query.isPending,
        error: query.error,
        onRetry: () => void query.refetch(),
        emptyTitle: t('alerts.empty'),
        rowActions: (r) =>
          r.status === 'NEW' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={ack.isPending}
              onClick={() => ack.mutate(r.id)}
            >
              {t('alerts.acknowledge')}
            </Button>
          ) : null,
      }}
      pagination={
        data
          ? {
              page: state.page,
              pageSize: state.pageSize,
              total: data.meta.total,
              onPageChange: list.setPage,
              onPageSizeChange: list.setPageSize,
              ariaLabel: title,
            }
          : undefined
      }
    />
  );
}
