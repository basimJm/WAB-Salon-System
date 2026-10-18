import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  BANNER_GENDERS,
  instantToDate,
  instantToEndDate,
  type Banner,
  type BannerGender,
  type BannerInput,
} from '@/domain/banners/banners';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import type { Column } from '../components/data/tableTypes';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useResourcePanel } from '../hooks/useResourcePanel';
import { BannerEditor } from './BannerEditor';

const OPTIONS = { filterKeys: ['gender'] };
const pickGender = (v: string | undefined): BannerGender | undefined =>
  BANNER_GENDERS.find((g) => g === v);

/** Admin PRD A24 · Home banners: artwork per language, action, audience, schedule, order. */
export default function BannersPage() {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const repo = repositories.banners.banners;
  const list = useListController(OPTIONS);
  const { state } = list;
  const gender = pickGender(state.filters['gender']?.[0]);
  const resource = useResourcePanel<Banner, BannerInput & { active: boolean }>(state, {
    queryName: 'getBanners',
    load: (s) => repo.list({ page: s.page, pageSize: s.pageSize, ...(gender ? { gender } : {}) }),
    save: (editing, v, reason) =>
      editing ? repo.update(editing.id, v, reason) : repo.create(v, reason),
  });
  if (resource.panel)
    return (
      <BannerEditor
        key={resource.panel.editing?.id ?? 'new'}
        item={resource.panel.editing}
        saving={resource.saving}
        error={resource.saveError}
        onSave={(v, reason) => resource.submit(v, reason)}
        onCancel={resource.close}
      />
    );
  const data = resource.query.data;
  const title = t('nav.sub.banners');
  const columns: Column<Banner>[] = [
    { key: 'order', header: t('banners.order'), ltr: true, render: (r) => r.order },
    { key: 'image', header: t('banners.image'), ltr: true, render: (r) => r.imageKey.en },
    { key: 'action', header: t('banners.action'), render: (r) => t(`banners.actions.${r.action}`) },
    { key: 'gender', header: t('banners.gender'), render: (r) => t(`banners.genders.${r.gender}`) },
    {
      key: 'schedule',
      header: t('banners.schedule'),
      ltr: true,
      render: (r) => `${instantToDate(r.startAt) || '—'} → ${instantToEndDate(r.endAt) || '—'}`,
    },
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
    <ListPage
      title={title}
      subtitle={t('banners.subtitle')}
      actions={<Button onClick={resource.openCreate}>{t('banners.add')}</Button>}
      filters={{
        active: gender
          ? [
              {
                key: 'gender',
                label: `${t('banners.gender')}: ${t(`banners.genders.${gender}`)}`,
                onRemove: () => list.setFilter('gender', []),
              },
            ]
          : [],
        onClearAll: list.clearFilters,
        controls: (
          <Select
            label={t('banners.gender')}
            value={gender ?? ''}
            options={[
              { value: '', label: t('appConfig.all') },
              ...BANNER_GENDERS.map((v) => ({ value: v, label: t(`banners.genders.${v}`) })),
            ]}
            onChange={(e) => list.setFilter('gender', e.target.value ? [e.target.value] : [])}
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
