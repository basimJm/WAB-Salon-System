import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import type { City } from '@/domain/locations/locations';
import { useListController } from '../controllers/useListController';
import { ChildLocationPage } from './ChildLocationPage';

const OPTIONS = { filterKeys: ['country'] };

/** Admin PRD A28 · Locations: cities (ar/en, active) under a country. */
export default function CitiesPage() {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const repo = repositories.locations.cities;
  const list = useListController(OPTIONS);
  return (
    <ChildLocationPage<City>
      parentKind="countries"
      list={list}
      filterKey="country"
      title={t('nav.sub.cities')}
      parentOf={(r) => r.countryCode}
      queryName="getLocationsCities"
      load={(countryCode, page, pageSize) =>
        repo.list({ page, pageSize, ...(countryCode ? { countryCode } : {}) })
      }
      save={(editing, v, reason) => {
        const { parent, ...rest } = v;
        return editing
          ? repo.update(editing.id, rest, reason)
          : repo.create({ ...rest, countryCode: parent }, reason);
      }}
    />
  );
}
