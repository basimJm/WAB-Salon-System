import type { TFunction } from 'i18next';
import { branchName, type Branch } from '@/domain/shared/branches';
import { formatNumber } from '@/domain/shared/format';
import { Badge } from '../../components/core/Badge';
import { StatusBadge } from '../../components/core/StatusBadge';
import type { Column } from '../../components/data/tableTypes';

export interface BranchColumnsInput {
  t: TFunction;
  language: 'ar' | 'en';
  areaName: (id: string | null) => string | undefined;
  staffOf: (id: string) => number;
}

/** Branches table: name (+ main), status (+ offline reason), readiness, area, staff and phone. */
export function branchColumns({
  t,
  language,
  areaName,
  staffOf,
}: BranchColumnsInput): Column<Branch>[] {
  return [
    {
      key: 'name',
      header: t('branches.name'),
      render: (b) => (
        <span className="wab-row">
          <span>{branchName(b.name, language)}</span>
          {b.isMain ? <Badge tone="violet">{t('branches.main')}</Badge> : null}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('branches.status'),
      render: (b) => (
        <span className="wab-stack">
          <StatusBadge kind="branch" value={b.status} />
          {b.offline ? (
            <span className="wab-muted">
              {t('branches.offlineSince', { reason: b.offline.reason })}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'ready',
      header: t('branches.completeness'),
      render: (b) =>
        b.completeness.isComplete ? (
          <Badge tone="green">{t('branches.complete')}</Badge>
        ) : (
          <span className="wab-muted">
            {t('branches.missing', { parts: b.completeness.missing.join(', ') })}
          </span>
        ),
    },
    {
      key: 'area',
      header: t('branches.area'),
      render: (b) => areaName(b.areaId) ?? b.locationText ?? t('salons.none'),
    },
    {
      key: 'staff',
      header: t('branches.staff'),
      ltr: true,
      render: (b) => formatNumber(staffOf(b.id), language),
    },
    {
      key: 'phone',
      header: t('branches.phone'),
      ltr: true,
      render: (b) => b.phone ?? t('salons.none'),
    },
  ];
}
