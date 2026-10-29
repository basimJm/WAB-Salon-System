import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MAX_BULK, REVIEW_STATUSES, REVIEW_TARGETS, type Review } from '@/domain/reviews/reviews';
import { Button } from '../components/core/Button';
import { SegmentedControl } from '../components/form/SegmentedControl';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';
import { reviewColumns } from './reviewColumns';
import { ReviewReasonDialog, ReviewRowActions, type Ask } from './reviewParts';
import { RATINGS, reviewFilters } from './reviewFilters';
import { SalonBranchFilters } from '../shared/SalonBranchFilters';
import { BUSINESS_TYPE_FILTER_KEY, businessTypeFilterOf } from '../shared/businessFilter';
import { BusinessTypeFilter } from '../shared/BusinessTypeFilter';
import { useReviewActions } from './useReviewActions';
import { BOOKINGS_STRINGS } from '@/locales/lazy/bookings';
import { useLazyStrings } from '../hooks/useLazyStrings';

const OPTIONS = {
  filterKeys: ['status', 'target', 'rating', 'salon', 'branch', BUSINESS_TYPE_FILTER_KEY],
};

/** Admin PRD A22 · Reviews: the moderation queue (oldest first), published reviews, bulk decisions, removal. */
export default function ReviewsPage() {
  useLazyStrings(BOOKINGS_STRINGS);
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const repo = repositories.reviews;
  const list = useListController(OPTIONS);
  const { state } = list;
  const { status, target, rating, query: reviewQuery } = reviewFilters(state);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [asking, setAsking] = useState<Ask>(null);
  const query = useQuery({
    queryKey: ['getReviews', state, status],
    queryFn: () => repo.list(reviewQuery),
  });
  const { decide, bulk } = useReviewActions(selected, () => {
    setSelected(new Set());
    setAsking(null);
  });
  const data = query.data;
  const title = t('nav.reviews');
  const columns = reviewColumns(t, language);
  const pending = status === 'PENDING';
  const over = selected.size > MAX_BULK;
  const onReason = (reason: string) => {
    if (!asking) return;
    if (asking.kind === 'bulk-reject') bulk.mutate({ decision: 'reject', reason });
    else decide.mutate({ kind: asking.kind, id: asking.review.id, reason });
  };
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('reviews.subtitle')}
        actions={
          <SegmentedControl
            ariaLabel={t('reviews.statusTabs')}
            value={status}
            options={REVIEW_STATUSES.map((s) => ({ value: s, label: t(`status.review.${s}`) }))}
            onChange={(s) => {
              setSelected(new Set());
              list.setFilter('status', [s]);
            }}
          />
        }
        filters={{
          active: [],
          onClearAll: list.clearFilters,
          controls: (
            <>
              <BusinessTypeFilter
                value={businessTypeFilterOf(state)}
                onChange={(type) => list.setFilter(BUSINESS_TYPE_FILTER_KEY, type ? [type] : [])}
              />
              <SalonBranchFilters
                salon={state.filters['salon']?.[0] ?? ''}
                branch={state.filters['branch']?.[0] ?? ''}
                onChange={(v) =>
                  list.setFilters({
                    salon: v.salon ? [v.salon] : [],
                    branch: v.branch ? [v.branch] : [],
                  })
                }
              />
              <Select
                label={t('reviews.target')}
                value={target ?? ''}
                options={[
                  { value: '', label: t('appConfig.all') },
                  ...REVIEW_TARGETS.map((x) => ({ value: x, label: t(`reviews.targets.${x}`) })),
                ]}
                onChange={(e) => list.setFilter('target', e.target.value ? [e.target.value] : [])}
              />
              <Select
                label={t('reviews.rating')}
                value={rating ? String(rating) : ''}
                options={[
                  { value: '', label: t('appConfig.all') },
                  ...RATINGS.map((x) => ({ value: String(x), label: String(x) })),
                ]}
                onChange={(e) => list.setFilter('rating', e.target.value ? [e.target.value] : [])}
              />
            </>
          ),
        }}
        toolbar={
          pending
            ? {
                selectedCount: selected.size,
                onClearSelection: () => setSelected(new Set()),
                bulkActions: (
                  <>
                    <Button
                      size="sm"
                      disabled={over || bulk.isPending}
                      onClick={() => bulk.mutate({ decision: 'approve' })}
                    >
                      {t('reviews.approveSelected')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={over}
                      onClick={() => setAsking({ kind: 'bulk-reject' })}
                    >
                      {t('reviews.rejectSelected')}
                    </Button>
                    {over ? (
                      <span role="alert">{t('reviews.tooMany', { max: MAX_BULK })}</span>
                    ) : null}
                  </>
                ),
              }
            : undefined
        }
        table={{
          columns,
          rows: data?.items ?? [],
          rowKey: (r) => r.id,
          caption: title,
          loading: query.isPending,
          error: query.error,
          onRetry: () => void query.refetch(),
          emptyTitle: t('reviews.empty'),
          ...(pending
            ? {
                selection: {
                  selected,
                  onChange: setSelected,
                  rowLabel: (r: Review) => `${r.salon.name} · ${String(r.rating)}`,
                },
              }
            : {}),
          rowActions: (r) => (
            <ReviewRowActions
              review={r}
              onApprove={() => decide.mutate({ kind: 'approve', id: r.id })}
              onAsk={(kind) => setAsking({ kind, review: r })}
            />
          ),
        }}
        pagination={
          data
            ? {
                page: state.page,
                pageSize: state.pageSize,
                total: data.meta.total,
                onPageChange: list.setPage,
                onPageSizeChange: list.setPageSize,
                ariaLabel: title,
              }
            : undefined
        }
      />
      <ReviewReasonDialog
        asking={asking}
        loading={decide.isPending || bulk.isPending}
        onConfirm={onReason}
        onClose={() => setAsking(null)}
      />
    </>
  );
}
