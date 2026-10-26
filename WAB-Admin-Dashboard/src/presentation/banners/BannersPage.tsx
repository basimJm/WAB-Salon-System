import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  BANNER_GENDERS,
  type Banner,
  type BannerGender,
  type BannerInput,
} from '@/domain/banners/banners';
import { Button } from '../components/core/Button';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useResourcePanel } from '../hooks/useResourcePanel';
import { BannerCard } from './BannerCard';
import { BannerEditor } from './BannerEditor';

const OPTIONS = { filterKeys: ['gender'] };
const pickGender = (v: string | undefined): BannerGender | undefined =>
  BANNER_GENDERS.find((g) => g === v);

/** Admin PRD A24 · Home banners (design card grid): artwork per language, action, audience, schedule, order. */
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
  const now = new Date();
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
      grid={{
        rows: data?.items ?? [],
        rowKey: (r) => r.id,
        caption: title,
        renderCard: (r) => <BannerCard banner={r} now={now} onEdit={resource.openEdit} />,
        loading: resource.query.isPending,
        error: resource.query.error,
        onRetry: () => void resource.query.refetch(),
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
