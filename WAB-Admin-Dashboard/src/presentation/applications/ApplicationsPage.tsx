import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import type { Application } from '@/domain/applications/applications';
import { SALON_STATES, type SalonState } from '@/domain/salons/salons';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';

const OPTIONS = { filterKeys: ['state'] };
const DEFAULT_STATE: SalonState = 'APPLICATION_PENDING';
const QUEUE_STATES = SALON_STATES.filter(
  (s) => s === 'APPLICATION_PENDING' || s === 'APPLICATION_REJECTED',
);

/** Admin PRD A14 · Salon applications queue, oldest first, with how many times each was resubmitted. */
export default function ApplicationsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const status = QUEUE_STATES.find((s) => s === state.filters['state']?.[0]) ?? DEFAULT_STATE;
  const query = useQuery({
    queryKey: ['getSalonsApplications', state, status],
    queryFn: () =>
      repositories.applications.list({ page: state.page, pageSize: state.pageSize, state: status }),
  });
  const data = query.data;
  const title = t('nav.sub.applications');
  const columns: Column<Application>[] = [
    { key: 'name', header: t('salons.name'), render: (r) => r.name },
    {
      key: 'owner',
      header: t('salons.owner'),
      render: (r) => (r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '—'),
    },
    { key: 'gender', header: t('salons.gender'), render: (r) => t(`catalog.genders.${r.gender}`) },
    {
      key: 'submitted',
      header: t('applications.submitted'),
      ltr: true,
      render: (r) => formatInstant(r.submittedAt, language, 'date'),
    },
    {
      key: 'resub',
      header: t('applications.resubmissions'),
      ltr: true,
      render: (r) => formatNumber(r.resubmissionCount, language),
    },
    {
      key: 'state',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="salon" value={r.state} />,
    },
  ];
  return (
    <ListPage
      title={title}
      subtitle={t('applications.subtitle')}
      filters={{
        active: [],
        onClearAll: list.clearFilters,
        controls: (
          <Select
            label={t('salons.state')}
            value={status}
            options={QUEUE_STATES.map((s) => ({ value: s, label: t(`status.salon.${s}`) }))}
            onChange={(e) => list.setFilter('state', [e.target.value])}
          />
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
        emptyTitle: t('applications.empty'),
        onRowClick: (r) => void navigate(`${ROUTES.salons}/applications/${r.id}`),
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
