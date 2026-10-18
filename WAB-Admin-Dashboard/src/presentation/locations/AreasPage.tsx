import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import type { Area } from '@/domain/locations/locations';
import { useListController } from '../controllers/useListController';
import { ChildLocationPage } from './ChildLocationPage';

const OPTIONS = { filterKeys: ['city'] };

/** Admin PRD A28 · Locations: areas (ar/en, active) under a city. */
export default function AreasPage() {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const repo = repositories.locations.areas;
  const list = useListController(OPTIONS);
  return (
    <ChildLocationPage<Area>
      parentKind="cities"
      list={list}
      filterKey="city"
      title={t('nav.sub.areas')}
      parentOf={(r) => r.cityId}
      queryName="getLocationsAreas"
      load={(cityId, page, pageSize) =>
        repo.list({ page, pageSize, ...(cityId ? { cityId } : {}) })
      }
      save={(editing, v, reason) => {
        const { parent, ...rest } = v;
        return editing
          ? repo.update(editing.id, rest, reason)
          : repo.create({ ...rest, cityId: parent }, reason);
      }}
    />
  );
}
