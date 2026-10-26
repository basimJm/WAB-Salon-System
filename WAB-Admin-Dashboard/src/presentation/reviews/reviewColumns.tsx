import type { TFunction } from 'i18next';
import type { Review } from '@/domain/reviews/reviews';
import type { Language } from '@/constants/i18n';
import { branchName } from '@/domain/shared/branches';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import { EntityCell, RatingCell } from '../components/data/TableCells';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';

/** Columns of the reviews table: what it is about, the rating and text, who wrote it, when, and its state. */
export function reviewColumns(t: TFunction, language: Language): Column<Review>[] {
  return [
    {
      key: 'target',
      header: t('reviews.target'),
      render: (r) => (r.staff ? `${t('reviews.staff')}: ${r.staff.firstName}` : t('reviews.salon')),
    },
    { key: 'salon', header: t('bookings.salon'), render: (r) => r.salon.name },
    {
      key: 'branch',
      header: t('branches.name'),
      render: (r) => (r.branch ? branchName(r.branch.name, language) : '—'),
    },
    {
      key: 'rating',
      header: t('reviews.rating'),
      ltr: true,
      render: (r) => <RatingCell avg={r.rating} language={language} />,
    },
    { key: 'comment', header: t('reviews.comment'), render: (r) => r.comment ?? '—' },
    {
      key: 'author',
      header: t('reviews.author'),
      render: (r) => (
        <EntityCell
          name={`${r.author.firstName} ${r.author.lastName}`}
          sub={t('reviews.previous', { count: formatNumber(r.authorOtherReviews, language) })}
        />
      ),
    },
    {
      key: 'at',
      header: t('salons.created'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'date'),
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="review" value={r.status} />,
    },
  ];
}
