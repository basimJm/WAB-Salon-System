import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/ContainerContext';

export interface ShellCounters {
  /** The bell badge: alerts still NEW. */
  alerts: number;
  /** Sidebar counters by nav id. */
  sidebar: Readonly<Record<string, number>>;
}

/**
 * Live numbers around the shell. Keys start with the operation id, so the realtime invalidation bus
 * (`alert.created`, `application.created`, `review.created`) refreshes them without any socket code here.
 */
export function useShellCounters(enabled: boolean): ShellCounters {
  const { repositories } = useContainer();
  const alerts = useQuery({
    queryKey: ['getAlertsCount'],
    queryFn: () => repositories.alerts.count(),
    enabled,
  });
  const applications = useQuery({
    queryKey: ['getSalonsApplications', 'count'],
    queryFn: () =>
      repositories.applications
        .list({ page: 1, pageSize: 1, state: 'APPLICATION_PENDING' })
        .then((p) => p.meta.total),
    enabled,
  });
  const reviews = useQuery({
    queryKey: ['getReviews', 'count'],
    queryFn: () =>
      repositories.reviews
        .list({ page: 1, pageSize: 1, status: 'PENDING' })
        .then((p) => p.meta.total),
    enabled,
  });
  const a = alerts.data ?? 0;
  return {
    alerts: a,
    sidebar: { alerts: a, applications: applications.data ?? 0, reviews: reviews.data ?? 0 },
  };
}
