import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { CAMPAIGN_STATUSES, type Campaign, type CampaignInput } from '@/domain/campaigns/campaigns';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import { Button } from '../components/core/Button';
import { Badge } from '../components/core/Badge';
import type { Column } from '../components/data/tableTypes';
import { Select } from '../components/form/Select';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { useToast } from '../components/overlay/Toast';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';
import { CampaignEditor } from './CampaignEditor';

const OPTIONS = { filterKeys: ['status'] };
const TONES = { SCHEDULED: 'violet', SENDING: 'amber', SENT: 'green', CANCELLED: 'grey' } as const;

/** Admin PRD A25 · Push campaigns: history with delivery stats, compose a new one, cancel one that has not started. */
export default function CampaignsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const repo = repositories.campaigns;
  const list = useListController(OPTIONS);
  const { state } = list;
  const status = CAMPAIGN_STATUSES.find((s) => s === state.filters['status']?.[0]);
  const [composing, setComposing] = useState(false);
  const [cancelling, setCancelling] = useState<Campaign | null>(null);
  const query = useQuery({
    queryKey: ['getCampaigns', state],
    queryFn: () =>
      repo.list({ page: state.page, pageSize: state.pageSize, ...(status ? { status } : {}) }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['getCampaigns'] });
  const create = useMutation({
    mutationFn: ({ input, reason }: { input: CampaignInput; reason: string }) =>
      repo.create(input, reason),
    onSuccess: async () => {
      setComposing(false);
      toast.show(t('campaigns.created'), 'success');
      await refresh();
    },
  });
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => repo.cancel(id, reason),
    onSuccess: async () => {
      setCancelling(null);
      toast.show(t('campaigns.cancelled'), 'success');
      await refresh();
    },
  });
  if (composing)
    return (
      <CampaignEditor
        saving={create.isPending}
        error={create.error}
        onSend={(input, reason) => create.mutate({ input, reason })}
        onCancel={() => setComposing(false)}
      />
    );
  const n = (v: number) => formatNumber(v, language);
  const title = t('nav.push');
  const columns: Column<Campaign>[] = [
    { key: 'title', header: t('campaigns.titleCol'), render: (r) => r.title[language] },
    { key: 'app', header: t('appConfig.appLabel'), render: (r) => t(`appConfig.app.${r.app}`) },
    {
      key: 'audience',
      header: t('campaigns.audience'),
      render: (r) => t(`campaigns.kinds.${r.audience.kind}`),
    },
    {
      key: 'when',
      header: t('campaigns.sendDay'),
      ltr: true,
      render: (r) => formatInstant(r.scheduledAt, language, 'dateTime'),
    },
    {
      key: 'stats',
      header: t('campaigns.stats'),
      ltr: true,
      render: (r) =>
        `${n(r.stats.targeted)} / ${n(r.stats.delivered)} / ${n(r.stats.opened)} / ${n(r.stats.failed)}`,
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <Badge tone={TONES[r.status]}>{t(`campaigns.status.${r.status}`)}</Badge>,
    },
  ];
  const data = query.data;
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('campaigns.subtitle')}
        actions={
          <Button
            onClick={() => {
              create.reset();
              setComposing(true);
            }}
          >
            {t('campaigns.new')}
          </Button>
        }
        filters={{
          active: status
            ? [
                {
                  key: 'status',
                  label: `${t('salons.state')}: ${t(`campaigns.status.${status}`)}`,
                  onRemove: () => list.setFilter('status', []),
                },
              ]
            : [],
          onClearAll: list.clearFilters,
          controls: (
            <Select
              label={t('salons.state')}
              value={status ?? ''}
              options={[
                { value: '', label: t('appConfig.all') },
                ...CAMPAIGN_STATUSES.map((s) => ({ value: s, label: t(`campaigns.status.${s}`) })),
              ]}
              onChange={(e) => list.setFilter('status', e.target.value ? [e.target.value] : [])}
            />
          ),
        }}
        table={{
          columns,
          rows: data?.items ?? [],
          rowKey: (r) => r.id,
          caption: title,
          loading: query.isPending,
          error: query.error,
          onRetry: () => void query.refetch(),
          emptyTitle: t('campaigns.empty'),
          rowActions: (r) =>
            r.status === 'SCHEDULED' ? (
              <Button variant="ghost" size="sm" onClick={() => setCancelling(r)}>
                {t('campaigns.cancel')}
              </Button>
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
        open={cancelling !== null}
        destructive
        title={t('campaigns.cancelTitle', { name: cancelling?.title[language] ?? '' })}
        description={t('campaigns.cancelText')}
        confirmLabel={t('campaigns.cancel')}
        loading={cancel.isPending}
        onConfirm={(reason) => cancelling && cancel.mutate({ id: cancelling.id, reason })}
        onClose={() => setCancelling(null)}
      />
    </>
  );
}
