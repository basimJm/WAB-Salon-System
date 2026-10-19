import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { DEFAULT_PAGE_SIZE } from '@/constants/ui';
import type { SalonActivity } from '@/domain/salons/salons';
import { formatInstant } from '@/domain/shared/format';
import { DataTable } from '../components/data/DataTable';
import { Pagination } from '../components/data/Pagination';
import type { Column } from '../components/data/tableTypes';
import { useLanguage } from '../hooks/useLanguage';

/** What admins did to this salon (edits, state changes), newest first, with their reasons. */
export function SalonActivityTab({ id }: { id: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const q = useQuery({
    queryKey: ['getSalonsByIdActivity', id, page, pageSize],
    queryFn: () => repositories.salons.activity(id, { page, pageSize }),
  });
  const columns: Column<SalonActivity>[] = [
    {
      key: 'action',
      header: t('salons.activity.action'),
      render: (r) =>
        t(`salons.activity.actions.${r.action}`, {
          defaultValue: r.action.replace(/_/g, ' ').toLowerCase(),
        }),
    },
    { key: 'reason', header: t('salons.activity.reason'), render: (r) => r.reason },
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
        caption={t('salons.activity.title')}
        columns={columns}
        rows={q.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        emptyTitle={t('salons.activity.empty')}
      />
      <Pagination
        ariaLabel={t('salons.activity.title')}
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
