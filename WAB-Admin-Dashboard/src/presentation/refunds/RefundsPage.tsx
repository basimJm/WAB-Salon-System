import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  MAX_REFERENCE,
  REFUND_STATUSES,
  canAct,
  isOverdue,
  type Refund,
} from '@/domain/refunds/refunds';
import { formatInstant, formatJodAmount } from '@/domain/shared/format';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';
import { Select } from '../components/form/Select';
import { TextField } from '../components/form/TextField';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { reasonError, ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useBranchNames } from '../hooks/useBranchOptions';
import { useLanguage } from '../hooks/useLanguage';
import { SalonBranchFilters } from '../shared/SalonBranchFilters';

const OPTIONS = { filterKeys: ['status', 'salon', 'branch'] };
type Ask = { kind: 'retry' | 'manual'; refund: Refund } | null;

function ManualDrawer({
  refund,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  refund: Refund;
  saving: boolean;
  error: unknown;
  onSubmit: (reference: string, reason: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const submit = () => {
    const found = new Set<string>();
    if (!reference.trim() || reference.length > MAX_REFERENCE) found.add('reference');
    if (reasonError(reason)) found.add('reason');
    setBad(found);
    if (found.size === 0) onSubmit(reference.trim(), reason.trim());
  };
  return (
    <ResourceDrawer
      title={t('refunds.manualTitle', { amount: refund.amount })}
      reason={reason}
      reasonErr={bad.has('reason') ? 'appConfig.error.reason' : undefined}
      onReason={setReason}
      saving={saving}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <p className="wab-field__hint">{t('refunds.manualText')}</p>
      <TextField
        label={t('refunds.reference')}
        dir="ltr"
        value={reference}
        error={
          bad.has('reference') ? t('refunds.error.reference', { max: MAX_REFERENCE }) : undefined
        }
        onChange={(e) => setReference(e.target.value)}
      />
    </ResourceDrawer>
  );
}

/** Admin PRD A17 · Refunds: status, attempts and the next attempt; retry a failed one or record a manual refund. */
export default function RefundsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const repo = repositories.refunds;
  const list = useListController(OPTIONS);
  const { state } = list;
  const status = REFUND_STATUSES.find((s) => s === state.filters['status']?.[0]);
  const f = (k: string) => state.filters[k]?.[0] ?? '';
  const [asking, setAsking] = useState<Ask>(null);
  const query = useQuery({
    queryKey: ['getRefunds', state],
    queryFn: () =>
      repo.list({
        page: state.page,
        pageSize: state.pageSize,
        ...(status ? { status } : {}),
        ...(f('salon') ? { salonId: f('salon') } : {}),
        ...(f('salon') && f('branch') ? { branchId: f('branch') } : {}),
      }),
  });
  const act = useMutation({
    mutationFn: async (a: { reason: string; reference?: string }) => {
      if (!asking) return;
      if (asking.kind === 'retry') await repo.retry(asking.refund.id, a.reason);
      else await repo.markManual(asking.refund.id, a.reference ?? '', a.reason);
    },
    onSuccess: async () => {
      setAsking(null);
      toast.show(t('refunds.done'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getRefunds'] });
    },
  });
  const branchNames = useBranchNames((query.data?.items ?? []).map((r) => r.salonId));
  const now = new Date();
  const title = t('nav.sub.refunds');
  const columns: Column<Refund>[] = [
    {
      key: 'at',
      header: t('transactions.at'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
    {
      key: 'amount',
      header: t('transactions.amount'),
      ltr: true,
      render: (r) => `${formatJodAmount(r.amount, language)} ${t('common.currency')}`,
    },
    {
      key: 'source',
      header: t('refunds.source'),
      render: (r) => t(`refunds.sources.${r.source}`, { defaultValue: r.source }),
    },
    {
      key: 'branch',
      header: t('branches.name'),
      render: (r) => (r.branchId ? (branchNames.get(r.branchId) ?? '—') : '—'),
    },
    { key: 'attempts', header: t('transactions.attempt'), ltr: true, render: (r) => r.attempts },
    {
      key: 'next',
      header: t('refunds.nextAttempt'),
      ltr: true,
      render: (r) => (r.nextAttemptAt ? formatInstant(r.nextAttemptAt, language, 'dateTime') : '—'),
    },
    { key: 'error', header: t('refunds.lastError'), render: (r) => r.lastError ?? '—' },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => (
        <>
          <StatusBadge kind="refund" value={r.status} />
          {isOverdue(r, now) ? <Badge tone="rose">{t('refunds.overdue')}</Badge> : null}
        </>
      ),
    },
  ];
  const data = query.data;
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('refunds.subtitle')}
        filters={{
          active: status
            ? [
                {
                  key: 'status',
                  label: `${t('salons.state')}: ${t(`status.refund.${status}`)}`,
                  onRemove: () => list.setFilter('status', []),
                },
              ]
            : [],
          onClearAll: list.clearFilters,
          controls: (
            <>
              <SalonBranchFilters
                salon={f('salon')}
                branch={f('branch')}
                onChange={(v) =>
                  list.setFilters({
                    salon: v.salon ? [v.salon] : [],
                    branch: v.branch ? [v.branch] : [],
                  })
                }
              />
              <Select
                label={t('salons.state')}
                value={status ?? ''}
                options={[
                  { value: '', label: t('appConfig.all') },
                  ...REFUND_STATUSES.map((s) => ({ value: s, label: t(`status.refund.${s}`) })),
                ]}
                onChange={(e) => list.setFilter('status', e.target.value ? [e.target.value] : [])}
              />
            </>
          ),
        }}
        table={{
          columns,
          rows: data?.items ?? [],
          rowKey: (r) => r.id,
          rowAlert: (r) => r.status === 'REFUND_FAILED' || isOverdue(r, now),
          caption: title,
          loading: query.isPending,
          error: query.error,
          onRetry: () => void query.refetch(),
          emptyTitle: t('refunds.empty'),
          rowActions: (r) =>
            canAct(r) ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    act.reset();
                    setAsking({ kind: 'retry', refund: r });
                  }}
                >
                  {t('refunds.retry')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    act.reset();
                    setAsking({ kind: 'manual', refund: r });
                  }}
                >
                  {t('refunds.manual')}
                </Button>
              </>
            ) : null,
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
      <ReasonDialog
        open={asking?.kind === 'retry'}
        title={t('refunds.retryTitle')}
        description={t('refunds.retryText')}
        confirmLabel={t('refunds.retry')}
        loading={act.isPending}
        onConfirm={(reason) => act.mutate({ reason })}
        onClose={() => setAsking(null)}
      />
      {asking?.kind === 'manual' ? (
        <ManualDrawer
          refund={asking.refund}
          saving={act.isPending}
          error={act.error}
          onSubmit={(reference, reason) => act.mutate({ reference, reason })}
          onClose={() => setAsking(null)}
        />
      ) : null}
    </>
  );
}
