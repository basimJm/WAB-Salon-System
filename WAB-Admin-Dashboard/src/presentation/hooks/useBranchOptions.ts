import { useQueries, useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/ContainerContext';
import { BRANCHES_QUERY } from '@/constants/branches';
import { branchName, sortBranches } from '@/domain/shared/branches';
import type { ParentOption } from './useLocationOptions';
import { useLanguage } from './useLanguage';

/** Branches of one salon (main first, closed ones last) for a filter select; empty until a salon is chosen. */
export function useBranchOptions(salonId: string | undefined): ParentOption[] {
  const { repositories } = useContainer();
  const { language } = useLanguage();
  const { data } = useQuery({
    queryKey: [BRANCHES_QUERY, { id: salonId }],
    queryFn: () => repositories.branches.list(salonId ?? ''),
    enabled: Boolean(salonId),
  });
  return sortBranches(data ?? [], language).map((b) => ({
    value: b.id,
    label: branchName(b.name, language),
  }));
}

/**
 * Branch id -> name for rows that only carry `branchId` (transactions, refunds): one cached branch list per distinct
 * salon of the visible page, so a 25-row page asks at most for the salons it shows.
 */
export function useBranchNames(salonIds: readonly string[]): ReadonlyMap<string, string> {
  const { repositories } = useContainer();
  const { language } = useLanguage();
  const unique = [...new Set(salonIds.filter(Boolean))];
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: [BRANCHES_QUERY, { id }],
      queryFn: () => repositories.branches.list(id),
    })),
  });
  const names = new Map<string, string>();
  for (const r of results)
    for (const b of r.data ?? []) names.set(b.id, branchName(b.name, language));
  return names;
}
