import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import type { CatalogService, CatalogServiceInput } from '@/domain/catalog/catalog';
import { audienceFor, type BusinessKind } from '@/domain/shared/businessType';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import type { Column } from '../components/data/tableTypes';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';
import { useResourcePanel } from '../hooks/useResourcePanel';
import { BUSINESS_TYPE_FILTER_KEY, businessTypeFilterOf } from '../shared/businessFilter';
import { BusinessBadges } from '../shared/BusinessBadges';
import { BusinessTypeFilter } from '../shared/BusinessTypeFilter';
import { CatalogDrawer } from './CatalogDrawer';

const OPTIONS = { filterKeys: [BUSINESS_TYPE_FILTER_KEY] };
/** A new service starts as a women's salon service unless the list shows clinics. */
const NEW_KIND: BusinessKind = { businessType: 'SALON', audience: 'FEMALE' };

/** Admin PRD A23 · Catalog services per business type + audience (§5.19). Never deleted: deactivate. */
export default function CatalogPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const repo = repositories.catalog.services;
  const list = useListController(OPTIONS);
  const { state } = list;
  const businessType = businessTypeFilterOf(state);
  const newKind: BusinessKind = businessType
    ? { businessType, audience: audienceFor(businessType, NEW_KIND.audience) }
    : NEW_KIND;
  const resource = useResourcePanel<CatalogService, CatalogServiceInput>(state, {
    queryName: 'getCatalogServices',
    load: (s) => repo.list({ page: s.page, pageSize: s.pageSize, businessType }),
    save: (editing, v, reason) => {
      if (!editing) return repo.create(v, reason);
      const { name, description, imageKey, active, sortOrder } = v;
      return repo.update(editing.id, { name, description, imageKey, active, sortOrder }, reason);
    },
  });
  const data = resource.query.data;
  const title = t('nav.catalog');
  const columns: Column<CatalogService>[] = [
    { key: 'order', header: t('catalog.order'), ltr: true, render: (r) => r.sortOrder },
    { key: 'name', header: t('catalog.name'), render: (r) => r.name[language] },
    {
      key: 'type',
      header: t('business.type'),
      render: (r) => <BusinessBadges businessType={r.businessType} audience={r.audience} />,
    },
    { key: 'image', header: t('catalog.image'), ltr: true, render: (r) => r.imageKey },
    {
      key: 'active',
      header: t('locations.status'),
      render: (r) => (
        <Badge tone={r.active ? 'green' : 'grey'}>
          {t(r.active ? 'locations.active' : 'locations.inactive')}
        </Badge>
      ),
    },
  ];
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('catalog.subtitle')}
        actions={
          <>
            <BusinessTypeFilter
              value={businessType}
              onChange={(type) => list.setFilter(BUSINESS_TYPE_FILTER_KEY, type ? [type] : [])}
            />
            <Button onClick={resource.openCreate}>{t('catalog.add')}</Button>
          </>
        }
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
      {resource.panel ? (
        <CatalogDrawer
          key={resource.panel.editing?.id ?? 'new'}
          item={resource.panel.editing}
          kind={newKind}
          saving={resource.saving}
          error={resource.saveError}
          onSubmit={(v, reason) => resource.submit(v, reason)}
          onClose={resource.close}
        />
      ) : null}
    </>
  );
}
