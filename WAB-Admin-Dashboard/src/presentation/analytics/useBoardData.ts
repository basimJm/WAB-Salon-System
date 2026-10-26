import { useQueries, useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/ContainerContext';
import type { EventCount, Overview } from '@/domain/analytics/analytics';
import type { InstantPair } from './useAnalyticsRange';

/** Count of one server event in an overview section (0 when the server did not list it). */
export const countOf = (
  overview: Overview | undefined,
  section: keyof Overview,
  name: string,
): number => overview?.[section][name] ?? 0;

/** `part / whole` as a ratio, or `undefined` when there is nothing to divide by. */
export const ratioOf = (part: number, whole: number): number | undefined =>
  whole > 0 ? part / whole : undefined;

/** The overview of the range and of the previous period (only while comparing). */
export function useOverviewPair(current: InstantPair, previous: InstantPair | null) {
  const { repositories } = useContainer();
  // Keys start with the operation id so the realtime bus refreshes them (`booking.updated`, `alert.created`).
  const now = useQuery({
    queryKey: ['getAnalyticsOverview', current],
    queryFn: () => repositories.analytics.overview(current),
  });
  const before = useQuery({
    queryKey: ['getAnalyticsOverview', previous],
    queryFn: () => repositories.analytics.overview(previous ?? current),
    enabled: previous !== null,
  });
  return { now, before: previous ? before.data : undefined };
}

export interface DaySeries {
  /** Days present in any series, oldest first (`YYYY-MM-DD`). */
  labels: string[];
  /** One row of counts per requested name, aligned with `labels` (0 on days without events). */
  values: number[][];
}

/** Aligns per-name day counts on one shared day axis. */
export function alignDays(perName: readonly (readonly EventCount[])[]): DaySeries {
  const labels = [...new Set(perName.flatMap((rows) => rows.map((r) => r.key)))].sort();
  const values = perName.map((rows) => {
    const byDay = new Map(rows.map((r) => [r.key, r.count]));
    return labels.map((day) => byDay.get(day) ?? 0);
  });
  return { labels, values };
}

/** Events per day, one query per name (the server sums the names it is given, so a stack needs one each). */
export function useDailyByName(names: readonly string[], current: InstantPair) {
  const { repositories } = useContainer();
  const results = useQueries({
    queries: names.map((name) => ({
      queryKey: ['getAnalyticsEvents', 'day', name, current],
      queryFn: () => repositories.analytics.events({ ...current, groupBy: 'DAY', names: [name] }),
    })),
  });
  const pending = results.some((r) => r.isPending);
  const error = results.find((r) => r.error)?.error ?? null;
  return { pending, error, series: alignDays(results.map((r) => r.data ?? [])) };
}
