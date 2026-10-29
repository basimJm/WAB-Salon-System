import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { moveId, type Placement } from '@/domain/placements/placements';
import { BUSINESS_TYPES, type BusinessType } from '@/domain/shared/businessType';
import { formatJodAmount } from '@/domain/shared/format';
import { MAX_PAGE_SIZE } from '@/constants/ui';
import { Button } from '../components/core/Button';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';
import { SegmentedControl } from '../components/form/SegmentedControl';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { useToast } from '../components/overlay/Toast';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { BUSINESS_TYPE_FILTER_KEY, businessTypeFilterOf } from '../shared/businessFilter';
import { BusinessBadges } from '../shared/BusinessBadges';
import { PlacementDrawer } from './PlacementDrawer';
import { instantDay } from './placementDays';

const OPTIONS = { filterKeys: [BUSINESS_TYPE_FILTER_KEY] };
const DEFAULT_TYPE: BusinessType = 'SALON';

/** Admin PRD A20 · Recommended salons / clinics per business type (§5.13, ordered per type): period, order, amount paid; end now, move up or down. */
export default function PlacementsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const repo = repositories.placements;
  const list = useListController(OPTIONS);
  const businessType = businessTypeFilterOf(list.state) ?? DEFAULT_TYPE;
  const [editing, setEditing] = useState<{ item: Placement | null } | null>(null);
  const [ending, setEnding] = useState<Placement | null>(null);
  const query = useQuery({
    queryKey: ['getRecommended', businessType],
    queryFn: () => repo.list({ page: 1, pageSize: MAX_PAGE_SIZE, businessType }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['getRecommended'] });
  const end = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => repo.end(id, reason),
    onSuccess: async () => {
      setEnding(null);
      toast.show(t('placements.ended'), 'success');
      await refresh();
    },
  });
  const move = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: -1 | 1 }) =>
      repo.reorder(
        businessType,
        moveId(
          (query.data?.items ?? []).map((p) => p.id),
          id,
          direction,
        ),
        t('placements.reorderReason'),
      ),
    onSuccess: refresh,
  });
  const items = query.data?.items ?? [];
  const title = t('nav.sub.recommended');
  const columns: Column<Placement>[] = [
    { key: 'order', header: t('placements.order'), ltr: true, render: (r) => r.order },
    { key: 'salon', header: t('placements.salon'), render: (r) => r.salon.name },
    {
      key: 'type',
      header: t('business.type'),
      render: (r) => <BusinessBadges businessType={r.businessType} audience={r.audience} />,
    },
    {
      key: 'period',
      header: t('placements.period'),
      ltr: true,
      render: (r) => `${instantDay(r.startAt, false)} → ${instantDay(r.endAt, true) || '—'}`,
    },
    {
      key: 'amount',
      header: t('placements.amount'),
      ltr: true,
      render: (r) => `${formatJodAmount(r.amountPaid, 'en')} ${t('common.currency')}`,
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="placement" value={r.status} />,
    },
  ];
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('placements.subtitle')}
        actions={
          <>
            <SegmentedControl
              ariaLabel={t('business.type')}
              value={businessType}
              options={BUSINESS_TYPES.map((b) => ({ value: b, label: t(`business.filter.${b}`) }))}
              onChange={(b) => list.setFilter(BUSINESS_TYPE_FILTER_KEY, [b])}
            />
            <Button onClick={() => setEditing({ item: null })}>{t('placements.add')}</Button>
          </>
        }
        table={{
          columns,
          rows: items,
          rowKey: (r) => r.id,
          caption: title,
          loading: query.isPending,
          error: query.error,
          onRetry: () => void query.refetch(),
          emptyTitle: t('placements.empty'),
          rowActions: (r) => (
            <>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('placements.moveUp', { name: r.salon.name })}
                disabled={move.isPending || items[0]?.id === r.id}
                onClick={() => move.mutate({ id: r.id, direction: -1 })}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('placements.moveDown', { name: r.salon.name })}
                disabled={move.isPending || items[items.length - 1]?.id === r.id}
                onClick={() => move.mutate({ id: r.id, direction: 1 })}
              >
                ↓
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing({ item: r })}>
                {t('appConfig.edit')}
              </Button>
              {r.status !== 'ENDED' ? (
                <Button variant="ghost" size="sm" onClick={() => setEnding(r)}>
                  {t('placements.endNow')}
                </Button>
              ) : null}
            </>
          ),
        }}
      />
      {editing ? (
        <PlacementDrawer
          key={editing.item?.id ?? 'new'}
          item={editing.item}
          businessType={businessType}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ReasonDialog
        open={ending !== null}
        destructive
        title={t('placements.endTitle', { name: ending?.salon.name ?? '' })}
        description={t('placements.endText')}
        confirmLabel={t('placements.endNow')}
        loading={end.isPending}
        onConfirm={(reason) => ending && end.mutate({ id: ending.id, reason })}
        onClose={() => setEnding(null)}
      />
    </>
  );
}
