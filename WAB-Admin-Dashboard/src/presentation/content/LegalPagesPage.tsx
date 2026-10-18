import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { APP_KINDS, type AppKind } from '@/domain/appconfig/appConfig';
import type { ContentPage, ContentPageInput } from '@/domain/content/content';
import { Button } from '../components/core/Button';
import type { Column } from '../components/data/tableTypes';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useResourcePanel } from '../hooks/useResourcePanel';
import { PageEditor } from './PageEditor';

const OPTIONS = { filterKeys: ['app'] };
const pickApp = (v: string | undefined): AppKind | undefined => APP_KINDS.find((a) => a === v);

/** Admin PRD A24 · Legal pages (Privacy, Terms, About) per app, rich text in Arabic and English. */
export default function LegalPagesPage() {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const repo = repositories.content.pages;
  const list = useListController(OPTIONS);
  const { state } = list;
  const app = pickApp(state.filters['app']?.[0]);
  const resource = useResourcePanel<ContentPage, ContentPageInput>(state, {
    queryName: 'getContentPages',
    load: (s) => repo.list({ page: s.page, pageSize: s.pageSize, ...(app ? { app } : {}) }),
    save: (editing, v, reason) =>
      editing ? repo.update(editing.id, { body: v.body }, reason) : repo.create(v, reason),
  });
  if (resource.panel)
    return (
      <PageEditor
        key={resource.panel.editing?.id ?? 'new'}
        item={resource.panel.editing}
        saving={resource.saving}
        error={resource.saveError}
        onSave={(v, reason) => resource.submit(v, reason)}
        onCancel={resource.close}
      />
    );
  const data = resource.query.data;
  const title = t('nav.sub.legal');
  const columns: Column<ContentPage>[] = [
    { key: 'app', header: t('appConfig.appLabel'), render: (r) => t(`appConfig.app.${r.app}`) },
    { key: 'kind', header: t('content.kind'), render: (r) => t(`content.kinds.${r.kind}`) },
  ];
  return (
    <ListPage
      title={title}
      subtitle={t('content.subtitle')}
      actions={<Button onClick={resource.openCreate}>{t('content.addPage')}</Button>}
      filters={{
        active: app
          ? [
              {
                key: 'app',
                label: `${t('appConfig.appLabel')}: ${t(`appConfig.app.${app}`)}`,
                onRemove: () => list.setFilter('app', []),
              },
            ]
          : [],
        onClearAll: list.clearFilters,
        controls: (
          <Select
            label={t('appConfig.appLabel')}
            value={app ?? ''}
            options={[
              { value: '', label: t('appConfig.all') },
              ...APP_KINDS.map((v) => ({ value: v, label: t(`appConfig.app.${v}`) })),
            ]}
            onChange={(e) => list.setFilter('app', e.target.value ? [e.target.value] : [])}
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
        rowActions: (r) => (
          <Button variant="ghost" size="sm" onClick={() => resource.openEdit(r)}>
            {t('appConfig.edit')}
          </Button>
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
  );
}
