import type { TFunction } from 'i18next';
import type { Review } from '@/domain/reviews/reviews';
import type { Language } from '@/constants/i18n';
import { formatInstant } from '@/domain/shared/format';
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
      key: 'rating',
      header: t('reviews.rating'),
      ltr: true,
      render: (r) => `${String(r.rating)} / 5`,
    },
    { key: 'comment', header: t('reviews.comment'), render: (r) => r.comment ?? '—' },
    {
      key: 'author',
      header: t('reviews.author'),
      render: (r) => `${r.author.firstName} ${r.author.lastName} (${String(r.authorOtherReviews)})`,
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
