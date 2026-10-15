import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import type { Transaction, TransactionDetails } from '@/domain/transactions/transactions';
import { formatInstant, formatJodAmount } from '@/domain/shared/format';
import { KeyValue } from '../components/core/KeyValue';
import { StatusBadge } from '../components/core/StatusBadge';
import { DataTable } from '../components/data/DataTable';
import type { Column } from '../components/data/tableTypes';
import { DetailPage } from '../components/templates/DetailPage';
import { JsonViewer } from '../components/templates/JsonViewer';
import { useLanguage } from '../hooks/useLanguage';

function Body({ tx }: { tx: TransactionDetails }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const jod = (v: string | null) =>
    v ? `${formatJodAmount(v, language)} ${t('common.currency')}` : null;
  const at = (iso: string | null) => (iso ? formatInstant(iso, language, 'dateTime') : null);
  const attempts: Column<Transaction>[] = [
    { key: 'n', header: t('transactions.attempt'), ltr: true, render: (a) => a.attempt },
    { key: 'at', header: t('transactions.at'), ltr: true, render: (a) => at(a.createdAt) },
    {
      key: 'code',
      header: t('transactions.gatewayCode'),
      ltr: true,
      render: (a) => a.gatewayCode ?? '—',
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (a) => <StatusBadge kind="transaction" value={a.status} />,
    },
  ];
  return (
    <div className="wab-stack">
      <KeyValue
        placeholder={t('salons.none')}
        items={[
          { key: 'amount', label: t('transactions.amount'), value: jod(tx.amount), ltr: true },
          { key: 'fee', label: t('transactions.fee'), value: jod(tx.gatewayFee), ltr: true },
          { key: 'type', label: t('transactions.type'), value: t(`transactions.types.${tx.type}`) },
          { key: 'code', label: t('transactions.gatewayCode'), value: tx.gatewayCode, ltr: true },
          { key: 'message', label: t('transactions.gatewayMessage'), value: tx.gatewayMessage },
          {
            key: 'provider',
            label: t('transactions.provider'),
            value: `${tx.provider} · ${tx.providerRef ?? '—'}`,
            ltr: true,
          },
          { key: 'charged', label: t('transactions.charged'), value: at(tx.chargedAt), ltr: true },
          {
            key: 'refunded',
            label: t('transactions.refunded'),
            value: at(tx.refundedAt),
            ltr: true,
          },
          {
            key: 'platform',
            label: t('transactions.platform'),
            value: `${tx.platform} ${tx.appVersion}`,
            ltr: true,
          },
          {
            key: 'booking',
            label: t('transactions.booking'),
            value: tx.bookingId ? (
              <RouterLink to={`${ROUTES.bookings}/${tx.bookingId}`}>{tx.bookingId}</RouterLink>
            ) : null,
          },
        ]}
      />
      <h2 className="wab-settings__title">{t('transactions.attempts')}</h2>
      <DataTable
        columns={attempts}
        rows={tx.attempts}
        rowKey={(a) => a.id}
        caption={t('transactions.attempts')}
      />
      <h2 className="wab-settings__title">{t('transactions.raw')}</h2>
      {tx.raw ? (
        <JsonViewer value={tx.raw} label={t('transactions.raw')} />
      ) : (
        <p>{t('salons.none')}</p>
      )}
    </div>
  );
}

/** Admin PRD A16 · One payment attempt: gateway answer as received, fee, and every attempt of the checkout. */
export default function TransactionDetailsPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { repositories } = useContainer();
  const query = useQuery({
    queryKey: ['getTransactionsById', { id }],
    queryFn: () => repositories.transactions.get(id),
  });
  const tx = query.data;
  return (
    <DetailPage
      title={
        tx
          ? `${t('transactions.attempt')} ${String(tx.attempt)} · ${tx.providerRef ?? tx.id}`
          : t('nav.sub.transactions')
      }
      back={{ to: '/finance/transactions', label: t('nav.sub.transactions') }}
      status={tx ? <StatusBadge kind="transaction" value={tx.status} /> : null}
      tabs={[
        { id: 'details', label: t('bookings.details'), content: tx ? <Body tx={tx} /> : null },
      ]}
      activeTab="details"
      onTabChange={() => undefined}
      tabsLabel={t('bookings.details')}
      loading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
    />
  );
}
