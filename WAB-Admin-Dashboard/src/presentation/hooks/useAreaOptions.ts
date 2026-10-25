import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/ContainerContext';
import { MAX_PAGE_SIZE } from '@/constants/ui';
import type { ParentOption } from './useLocationOptions';
import { useLanguage } from './useLanguage';

export interface AreaOption extends ParentOption {
  cityId: string;
}

/** Areas (by id) in the current language: all of them for name lookups, or the ones of one city for a select. */
export function useAreaOptions(cityId?: string): AreaOption[] {
  const { repositories } = useContainer();
  const { language } = useLanguage();
  const { data } = useQuery({
    queryKey: ['getLocations', 'areas', 'options'],
    queryFn: () =>
      repositories.locations.areas
        .list({ page: 1, pageSize: MAX_PAGE_SIZE })
        .then((p) => p.items.map((a) => ({ value: a.id, name: a.name, cityId: a.cityId }))),
  });
  return (data ?? [])
    .filter((a) => cityId === undefined || a.cityId === cityId)
    .map((a) => ({ value: a.value, label: a.name[language], cityId: a.cityId }));
}
