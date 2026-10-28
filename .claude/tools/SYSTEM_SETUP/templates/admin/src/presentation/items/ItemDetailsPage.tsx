import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import { ITEM_ENTITY_TYPE, type Item, type ItemInput } from '@/domain/items/items';
import { humanizeAction, type AuditLog } from '@/domain/audit/audit';
import { formatInstant } from '@/domain/shared/format';
import { ITEMS_STRINGS } from '@/locales/lazy/items';
import { Button } from '../components/core/Button';
import { KeyValue } from '../components/core/KeyValue';
import { StatusBadge } from '../components/core/StatusBadge';
import { DataTable } from '../components/data/DataTable';
import type { Column } from '../components/data/tableTypes';
import { useToast } from '../components/overlay/Toast';
import { DetailPage } from '../components/templates/DetailPage';
import { useLanguage } from '../hooks/useLanguage';
import { useLazyStrings } from '../hooks/useLazyStrings';
import { ItemDrawer } from './ItemDrawer';

const HISTORY_PAGE_SIZE = 25;

function Overview({ item }: { item: Item }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const at = (iso: string) => formatInstant(iso, language, 'dateTime');
  return (
    <KeyValue
      placeholder={t('common.none')}
      items={[
        { key: 'name', label: t('items.name'), value: item.name },
        { key: 'description', label: t('items.description'), value: item.description },
        { key: 'created', label: t('items.createdAt'), value: at(item.createdAt), ltr: true },
        { key: 'updated', label: t('items.updatedAt'), value: at(item.updatedAt), ltr: true },
        { key: 'by', label: t('items.updatedBy'), value: item.updatedBy, ltr: true },
        { key: 'id', label: t('items.id'), value: item.id, ltr: true },
      ]}
    />
  );
}

/** Every audited admin change of this record, read from the audit log by entity. */
function History({ id }: { id: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const query = useQuery({
    queryKey: ['getAuditLogs', { entityType: ITEM_ENTITY_TYPE, entityId: id }],
    queryFn: () =>
      repositories.audit.list({
        page: 1,
        pageSize: HISTORY_PAGE_SIZE,
        entityType: ITEM_ENTITY_TYPE,
        entityId: id,
      }),
  });
  const columns: Column<AuditLog>[] = [
    {
      key: 'at',
      header: t('common.at'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
    { key: 'action', header: t('items.action'), render: (r) => humanizeAction(r.action) },
    { key: 'reason', header: t('reason.label'), render: (r) => r.reason },
  ];
  return (
    <DataTable
      caption={t('items.history')}
      columns={columns}
      rows={query.data?.items ?? []}
      rowKey={(r) => r.id}
      loading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyTitle={t('items.noHistory')}
    />
  );
}

/** PRD P02 · One item: facts, audit history, and edit in the same panel as the list (reason required). */
export default function ItemDetailsPage() {
  useLazyStrings(ITEMS_STRINGS);
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const query = useQuery({
    queryKey: ['getItemsById', { id }],
    queryFn: () => repositories.items.get(id),
  });
  const save = useMutation({
    mutationFn: ({ values, reason }: { values: ItemInput; reason: string }) =>
      repositories.items.update(id, values, reason),
    onSuccess: async () => {
      setEditing(false);
      toast.show(t('items.saved'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getItemsById'] });
      await queryClient.invalidateQueries({ queryKey: ['getItems'] });
      await queryClient.invalidateQueries({ queryKey: ['getAuditLogs'] });
    },
  });
  const item = query.data;
  return (
    <>
      <DetailPage
        title={item?.name ?? t('nav.items')}
        back={{ to: ROUTES.items, label: t('nav.items') }}
        status={item ? <StatusBadge kind="item" value={item.status} /> : null}
        actions={
          item ? (
            <Button
              onClick={() => {
                save.reset();
                setEditing(true);
              }}
            >
              {t('common.edit')}
            </Button>
          ) : null
        }
        tabs={[
          {
            id: 'overview',
            label: t('items.overview'),
            content: item ? <Overview item={item} /> : null,
          },
          { id: 'history', label: t('items.history'), content: <History id={id} /> },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        tabsLabel={t('items.sections')}
        loading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
      {editing && item ? (
        <ItemDrawer
          item={item}
          saving={save.isPending}
          error={save.error}
          onSubmit={(values, reason) => save.mutate({ values, reason })}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  );
}
