import { EntityCell, RatingCell } from '../components/data/TableCells';
import type { TFunction } from 'i18next';
import { hasOpenDeletionRequest } from '@/domain/salons/salonRules';
import type { SalonSummary } from '@/domain/salons/salons';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import type { Language } from '@/constants/i18n';
import { Badge } from '../components/core/Badge';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';
import { BusinessBadges } from '../shared/BusinessBadges';

/** The columns of the salon list (Admin PRD A13). */
export function salonColumns(
  t: TFunction,
  language: Language,
  cityName: (id: string | null) => string,
): Column<SalonSummary>[] {
  return [
    {
      key: 'name',
      header: t('salons.name'),
      render: (r) => (
        <EntityCell
          name={r.name}
          badge={
            hasOpenDeletionRequest(r) ? (
              <Badge tone="amber">{t('salons.deletionAsked')}</Badge>
            ) : undefined
          }
        />
      ),
    },
    {
      key: 'type',
      header: t('business.type'),
      render: (r) => <BusinessBadges businessType={r.businessType} audience={r.audience} />,
    },
    { key: 'city', header: t('salons.city'), render: (r) => cityName(r.cityId) },
    {
      key: 'state',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="salon" value={r.state} />,
    },
    {
      key: 'rating',
      header: t('salons.rating'),
      ltr: true,
      render: (r) => <RatingCell avg={r.rating.avg} count={r.rating.count} language={language} />,
    },
    {
      key: 'sub',
      header: t('salons.subscription'),
      render: (r) =>
        r.subscriptionStatus ? (
          <StatusBadge kind="subscription" value={r.subscriptionStatus} />
        ) : (
          '—'
        ),
    },
    {
      key: 'recommended',
      header: t('salons.recommended'),
      render: (r) =>
        r.recommended ? <Badge tone="green">{t('salons.recommendedYes')}</Badge> : '—',
    },
    {
      key: 'bookings30d',
      header: t('salons.bookings30d'),
      ltr: true,
      render: (r) => formatNumber(r.bookings30d, language),
    },
    {
      key: 'created',
      header: t('salons.created'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'date'),
    },
  ];
}
