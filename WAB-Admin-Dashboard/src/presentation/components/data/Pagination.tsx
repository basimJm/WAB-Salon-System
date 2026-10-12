import { useTranslation } from 'react-i18next';
import { PAGE_SIZE_OPTIONS } from '@/constants/ui';
import { Select } from '../form/Select';
import { IconButton } from '../core/IconButton';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const pageCount = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { t } = useTranslation();
  const pages = pageCount(total, pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="wab-pagination" aria-label={t('table.pagination')}>
      <span className="wab-pagination__range">{t('table.range', { from, to, total })}</span>
      <Select
        label={t('table.pageSize')}
        value={String(pageSize)}
        options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="wab-pagination__size"
      />
      <IconButton
        icon="chevronStart"
        directional
        label={t('table.previous')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      />
      <span className="wab-pagination__page">{t('table.pageOf', { page, pages })}</span>
      <IconButton
        icon="chevronEnd"
        directional
        label={t('table.next')}
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      />
    </nav>
  );
}
