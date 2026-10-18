import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { RECONCILIATION_KINDS, type Transaction } from '@/domain/transactions/transactions';
import { formatInstant, formatJodAmount } from '@/domain/shared/format';
import { Badge } from '../components/core/Badge';
import { Card } from '../components/core/Card';
import { PageHeader } from '../components/core/PageHeader';
import { StatusBadge } from '../components/core/StatusBadge';
import { DataTable } from '../components/data/DataTable';
import type { Column } from '../components/data/tableTypes';
import { AsyncView } from '../components/feedback/AsyncView';
import { Skeleton } from '../components/feedback/Skeleton';
import { useLanguage } from '../hooks/useLanguage';

const DETAILS = '/finance/transactions';

/** Admin PRD A21 · Payment problems: stuck pending, paid without a booking, missing ledger charge. */
export default function ReconciliationPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { repositories } = useContainer();
  const query = useQuery({
    queryKey: ['getFinanceReconciliation'],
    queryFn: () => repositories.transactions.reconciliation(),
  });
  const columns: Column<Transaction>[] = [
    {
      key: 'at',
      header: t('transactions.at'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
    {
      key: 'amount',
      header: t('transactions.amount'),
      ltr: true,
      render: (r) => `${formatJodAmount(r.amount, language)} ${t('common.currency')}`,
    },
    {
      key: 'code',
      header: t('transactions.gatewayCode'),
      ltr: true,
      render: (r) => r.gatewayCode ?? '—',
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="transaction" value={r.status} />,
    },
  ];
  const data = query.data;
  const total = data ? RECONCILIATION_KINDS.reduce((n, k) => n + data[k].length, 0) : 0;
  return (
    <div className="wab-page wab-stack">
      <PageHeader
        title={t('nav.sub.reconciliation')}
        subtitle={t('reconciliation.subtitle')}
        actions={
          data ? (
            <Badge tone={total === 0 ? 'green' : 'rose'}>
              {total === 0
                ? t('reconciliation.clean')
                : t('reconciliation.problems', { count: total })}
            </Badge>
          ) : null
        }
      />
      <AsyncView
        loading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        skeleton={<Skeleton height="lg" />}
      >
        {RECONCILIATION_KINDS.map((kind) => (
          <Card key={kind} aria-label={t(`reconciliation.kinds.${kind}`)}>
            <h2 className="wab-settings__title">
              {t(`reconciliation.kinds.${kind}`)} ({data?.[kind].length ?? 0})
            </h2>
            <p className="wab-muted">{t(`reconciliation.hints.${kind}`)}</p>
            <DataTable
              columns={columns}
              rows={data?.[kind] ?? []}
              rowKey={(r) => r.id}
              caption={t(`reconciliation.kinds.${kind}`)}
              emptyTitle={t('reconciliation.none')}
              onRowClick={(r) => void navigate(`${DETAILS}/${r.id}`)}
            />
          </Card>
        ))}
      </AsyncView>
    </div>
  );
}
