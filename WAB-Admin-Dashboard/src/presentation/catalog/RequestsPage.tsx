import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  MAX_DESCRIPTION,
  MAX_NAME,
  REQUEST_STATUSES,
  type ApproveInput,
  type CatalogRequest,
  type RequestStatus,
} from '@/domain/catalog/catalog';
import { formatInstant } from '@/domain/shared/format';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import type { Column } from '../components/data/tableTypes';
import { TextField } from '../components/form/TextField';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { reasonError, ResourceDrawer, Select } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';
import { useResourcePanel } from '../hooks/useResourcePanel';

const OPTIONS = { filterKeys: ['status'] };
const DEFAULT_STATUS: RequestStatus = 'PENDING';
const TONES = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'rose' } as const;

function ApproveDrawer({
  item,
  resource,
}: {
  item: CatalogRequest;
  resource: ReturnType<typeof useApprove>;
}) {
  const { t } = useTranslation();
  // The salon wrote the text in one language: start both fields from it and let the admin translate.
  const [v, setV] = useState({
    nameAr: item.name,
    nameEn: item.name,
    descAr: item.description,
    descEn: item.description,
    reason: '',
  });
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const submit = () => {
    const found = new Set<string>();
    if (!v.nameAr.trim() || v.nameAr.length > MAX_NAME) found.add('nameAr');
    if (!v.nameEn.trim() || v.nameEn.length > MAX_NAME) found.add('nameEn');
    if (!v.descAr.trim() || v.descAr.length > MAX_DESCRIPTION) found.add('descAr');
    if (!v.descEn.trim() || v.descEn.length > MAX_DESCRIPTION) found.add('descEn');
    if (reasonError(v.reason)) found.add('reason');
    setBad(found);
    if (found.size > 0) return;
    resource.submit(
      {
        name: { ar: v.nameAr.trim(), en: v.nameEn.trim() },
        description: { ar: v.descAr.trim(), en: v.descEn.trim() },
        ...(item.imageKey ? { imageKey: item.imageKey } : {}),
      },
      v.reason.trim(),
    );
  };
  const field = (k: 'nameAr' | 'nameEn' | 'descAr' | 'descEn', dir: 'rtl' | 'ltr', max: number) => (
    <TextField
      label={t(`catalog.${k}`)}
      dir={dir}
      value={v[k]}
      error={bad.has(k) ? t(`catalog.error.${k}`, { max }) : undefined}
      onChange={(e) => setV({ ...v, [k]: e.target.value })}
    />
  );
  return (
    <ResourceDrawer
      title={t('catalog.approveTitle')}
      reason={v.reason}
      reasonErr={bad.has('reason') ? 'appConfig.error.reason' : undefined}
      onReason={(reason) => setV({ ...v, reason })}
      saving={resource.saving}
      error={resource.saveError}
      onSubmit={submit}
      onClose={resource.close}
    >
      <p className="wab-field__hint">{t('catalog.approveHint', { name: item.name })}</p>
      {field('nameAr', 'rtl', MAX_NAME)}
      {field('nameEn', 'ltr', MAX_NAME)}
      {field('descAr', 'rtl', MAX_DESCRIPTION)}
      {field('descEn', 'ltr', MAX_DESCRIPTION)}
    </ResourceDrawer>
  );
}

function useApprove(state: ReturnType<typeof useListController>['state'], status: RequestStatus) {
  const { repositories } = useContainer();
  const repo = repositories.catalog.requests;
  return useResourcePanel<CatalogRequest, ApproveInput>(state, {
    queryName: 'getCatalogRequests',
    load: (s) => repo.list({ page: s.page, pageSize: s.pageSize, status }),
    save: (editing, v, reason) =>
      editing ? repo.approve(editing.id, v, reason) : Promise.reject(new Error('no request')),
  });
}

/** Admin PRD A23 · Salon suggestions for new catalog services: approve (creates the service) or reject with a note. */
export default function RequestsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const status = REQUEST_STATUSES.find((s) => s === state.filters['status']?.[0]) ?? DEFAULT_STATUS;
  const resource = useApprove(state, status);
  const [rejecting, setRejecting] = useState<CatalogRequest | null>(null);
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      repositories.catalog.requests.reject(id, reason),
    onSuccess: async () => {
      setRejecting(null);
      toast.show(t('catalog.rejected'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getCatalogRequests'] });
    },
  });
  const data = resource.query.data;
  const title = t('nav.sub.requests');
  const columns: Column<CatalogRequest>[] = [
    { key: 'salon', header: t('catalog.salon'), render: (r) => r.salonName ?? r.salonId },
    { key: 'name', header: t('catalog.name'), render: (r) => r.name },
    { key: 'desc', header: t('catalog.description'), render: (r) => r.description },
    {
      key: 'status',
      header: t('locations.status'),
      render: (r) => <Badge tone={TONES[r.status]}>{t(`catalog.requestStatus.${r.status}`)}</Badge>,
    },
    {
      key: 'at',
      header: t('catalog.requestedAt'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'date'),
    },
  ];
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('catalog.requestsSubtitle')}
        filters={{
          active: [],
          onClearAll: list.clearFilters,
          controls: (
            <Select
              label={t('locations.status')}
              value={status}
              options={REQUEST_STATUSES.map((s) => ({
                value: s,
                label: t(`catalog.requestStatus.${s}`),
              }))}
              onChange={(e) => list.setFilter('status', [e.target.value])}
            />
          ),
        }}
        table={{
          columns,
          rows: data?.items ?? [],
          rowKey: (r) => r.id,
          caption: title,
          loading: resource.query.isPending,
          error: resource.query.error,
          onRetry: () => void resource.query.refetch(),
          emptyTitle: t('catalog.noRequests'),
          rowActions: (r) =>
            r.status === 'PENDING' ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => resource.openEdit(r)}>
                  {t('catalog.approve')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRejecting(r)}>
                  {t('catalog.reject')}
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
      {resource.panel?.editing ? (
        <ApproveDrawer
          key={resource.panel.editing.id}
          item={resource.panel.editing}
          resource={resource}
        />
      ) : null}
      <ReasonDialog
        open={rejecting !== null}
        destructive
        title={t('catalog.rejectTitle', { name: rejecting?.name ?? '' })}
        description={t('catalog.rejectText')}
        confirmLabel={t('catalog.reject')}
        loading={reject.isPending}
        onConfirm={(reason) => rejecting && reject.mutate({ id: rejecting.id, reason })}
        onClose={() => setRejecting(null)}
      />
    </>
  );
}
