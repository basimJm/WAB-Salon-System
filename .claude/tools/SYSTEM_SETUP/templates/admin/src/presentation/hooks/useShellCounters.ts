import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/ContainerContext';

export interface ShellCounters {
  /** The bell badge: alerts still NEW. */
  alerts: number;
  /** Sidebar counters by nav id (a module with a queue adds its count here). */
  sidebar: Readonly<Record<string, number>>;
}

/**
 * Live numbers around the shell. Keys start with the operation id, so the realtime invalidation bus
 * (`alert.created`) refreshes them without any socket code here.
 */
export function useShellCounters(enabled: boolean): ShellCounters {
  const { repositories } = useContainer();
  const alerts = useQuery({
    queryKey: ['getAlertsCount'],
    queryFn: () => repositories.alerts.count(),
    enabled,
  });
  const a = alerts.data ?? 0;
  return { alerts: a, sidebar: { alerts: a } };
}
