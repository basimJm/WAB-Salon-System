import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/ContainerContext';
import { MAX_PAGE_SIZE } from '@/constants/ui';
import { useLanguage } from '../hooks/useLanguage';

export interface ParentOption {
  value: string;
  label: string;
}

/** Countries (by code) or cities (by id) for the parent select and the list filter, in the current language. */
export function useParentOptions(kind: 'countries' | 'cities'): ParentOption[] {
  const { repositories } = useContainer();
  const { language } = useLanguage();
  const { data } = useQuery({
    queryKey: ['getLocations', kind, 'options'],
    queryFn: () =>
      kind === 'countries'
        ? repositories.locations.countries
            .list({ page: 1, pageSize: MAX_PAGE_SIZE })
            .then((p) => p.items.map((c) => ({ value: c.code, name: c.name })))
        : repositories.locations.cities
            .list({ page: 1, pageSize: MAX_PAGE_SIZE })
            .then((p) => p.items.map((c) => ({ value: c.id, name: c.name }))),
  });
  return (data ?? []).map((o) => ({ value: o.value, label: o.name[language] }));
}
