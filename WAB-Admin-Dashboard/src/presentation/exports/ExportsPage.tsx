import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { isFinished, type ExportJob } from '@/domain/exports/exports';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';
import { ListPage } from '../components/templates/ListPage';
import { useLanguage } from '../hooks/useLanguage';

const SIZE = 25;
const REFRESH_MS = 3_000;

/** Admin PRD §2 · Export history: what was asked, its state, and a download link while the file is available. */
export default function ExportsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['getExports', page],
    queryFn: () => repositories.exports.list({ page, pageSize: SIZE }),
    // Keep looking while something is still being generated.
    refetchInterval: (q) => (q.state.data?.items.some((j) => !isFinished(j)) ? REFRESH_MS : false),
  });
  const title = t('nav.sub.exports');
  const columns: Column<ExportJob>[] = [
    {
      key: 'at',
      header: t('transactions.at'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
    { key: 'kind', header: t('exports.kind'), render: (r) => t(`exports.kinds.${r.kind}`) },
    { key: 'format', header: t('exports.format'), ltr: true, render: (r) => r.format },
    {
      key: 'rows',
      header: t('exports.rows'),
      ltr: true,
      render: (r) => (r.rowCount === null ? '—' : formatNumber(r.rowCount, language)),
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="export" value={r.status} />,
    },
    {
      key: 'file',
      header: t('exports.file'),
      render: (r) =>
        r.downloadUrl ? (
          <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer">
            {t('exports.download')}
          </a>
        ) : r.failure ? (
          t(`exports.failures.${r.failure}`)
        ) : (
          '—'
        ),
    },
  ];
  const data = query.data;
  return (
    <ListPage
      title={title}
      subtitle={t('exports.subtitle')}
      table={{
        columns,
        rows: data?.items ?? [],
        rowKey: (r) => r.id,
        caption: title,
        loading: query.isPending,
        error: query.error,
        onRetry: () => void query.refetch(),
        emptyTitle: t('exports.empty'),
      }}
      pagination={
        data
          ? {
              page,
              pageSize: SIZE,
              total: data.meta.total,
              onPageChange: setPage,
              onPageSizeChange: () => undefined,
              ariaLabel: title,
            }
          : undefined
      }
    />
  );
}
