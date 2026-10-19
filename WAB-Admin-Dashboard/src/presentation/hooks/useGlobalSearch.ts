import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import type { SearchResults } from '../components/layout/GlobalSearch';
import { toSearchResults } from '../utils/searchHits';

/** The `search` function of the top bar: server lookup + mapping to links. */
export function useGlobalSearch(): (text: string) => Promise<SearchResults> {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  return useCallback(
    async (text) => toSearchResults(await repositories.search.search(text), t),
    [repositories, t],
  );
}
