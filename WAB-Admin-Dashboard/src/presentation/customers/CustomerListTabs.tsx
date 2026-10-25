import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { DEFAULT_PAGE_SIZE } from '@/constants/ui';
import type { CustomerNotification, CustomerReview } from '@/domain/customers/customers';
import { branchName } from '@/domain/shared/branches';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import { StatusBadge } from '../components/core/StatusBadge';
import { DataTable } from '../components/data/DataTable';
import { Pagination } from '../components/data/Pagination';
import type { Column } from '../components/data/tableTypes';
import { useLanguage } from '../hooks/useLanguage';

/** Reviews the customer wrote (all states), newest first. */
export function CustomerReviewsTab({ id }: { id: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const q = useQuery({
    queryKey: ['getCustomersByIdReviews', id, page, pageSize],
    queryFn: () => repositories.customers.reviews(id, { page, pageSize }),
  });
  const columns: Column<CustomerReview>[] = [
    { key: 'salon', header: t('nav.sub.allSalons'), render: (r) => r.salon.name },
    {
      key: 'branch',
      header: t('branches.name'),
      render: (r) => (r.branch ? branchName(r.branch.name, language) : '—'),
    },
    {
      key: 'target',
      header: t('reviews.target'),
      render: (r) => t(`reviews.targets.${r.target}`, { defaultValue: r.target }),
    },
    {
      key: 'rating',
      header: t('reviews.rating'),
      ltr: true,
      render: (r) => formatNumber(r.rating, language),
    },
    { key: 'comment', header: t('reviews.comment'), render: (r) => r.comment ?? '—' },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="review" value={r.status} />,
    },
    {
      key: 'at',
      header: t('transactions.at'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
  ];
  return (
    <div className="wab-stack">
      <DataTable
        caption={t('customers.reviews')}
        columns={columns}
        rows={q.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        emptyTitle={t('customers.noReviews')}
      />
      <Pagination
        ariaLabel={t('customers.reviews')}
        page={page}
        pageSize={pageSize}
        total={q.data?.meta.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
    </div>
  );
}

/** Notifications the customer received and whether the push reached the device. */
export function CustomerNotificationsTab({ id }: { id: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const q = useQuery({
    queryKey: ['getCustomersByIdNotifications', id, page, pageSize],
    queryFn: () => repositories.customers.notifications(id, { page, pageSize }),
  });
  const columns: Column<CustomerNotification>[] = [
    { key: 'title', header: t('customers.notificationTitle'), render: (r) => r.title[language] },
    {
      key: 'type',
      header: t('customers.notificationType'),
      render: (r) => t(`customers.types.${r.type}`),
    },
    {
      key: 'read',
      header: t('customers.read'),
      render: (r) => (r.readAt ? t('salonEdit.yes') : t('salonEdit.no')),
    },
    {
      key: 'push',
      header: t('customers.pushDelivered'),
      render: (r) => (r.pushSent ? t('salonEdit.yes') : t('salonEdit.no')),
    },
    {
      key: 'at',
      header: t('transactions.at'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
  ];
  return (
    <div className="wab-stack">
      <DataTable
        caption={t('customers.notifications')}
        columns={columns}
        rows={q.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        emptyTitle={t('customers.noNotifications')}
      />
      <Pagination
        ariaLabel={t('customers.notifications')}
        page={page}
        pageSize={pageSize}
        total={q.data?.meta.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
    </div>
  );
}
