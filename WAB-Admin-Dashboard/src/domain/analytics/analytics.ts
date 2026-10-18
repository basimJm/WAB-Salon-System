export interface Overview {
  readonly payments: Readonly<Record<string, number>>;
  readonly refunds: Readonly<Record<string, number>>;
  readonly bookings: Readonly<Record<string, number>>;
  readonly errors: Readonly<Record<string, number>>;
}
export interface EventCount {
  readonly key: string;
  readonly count: number;
}
export interface EventsQuery {
  /** Instants (inclusive start, exclusive end). */
  from: string;
  to: string;
  groupBy?: 'NAME' | 'DAY';
  names?: readonly string[];
}

export interface AnalyticsRepository {
  overview(range: { from: string; to: string }): Promise<Overview>;
  events(query: EventsQuery): Promise<readonly EventCount[]>;
}

export const OVERVIEW_GROUPS = ['payments', 'refunds', 'bookings', 'errors'] as const;
export type OverviewGroup = (typeof OVERVIEW_GROUPS)[number];

export const sumCounts = (counts: Readonly<Record<string, number>>): number =>
  Object.values(counts).reduce((n, v) => n + v, 0);

/** Change against the previous period in percent; no change when there was nothing before. */
export function deltaPercent(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Keeps the counts whose event name starts with the prefix (`booking.` -> `booking.created`). */
export const withPrefix = (rows: readonly EventCount[], prefix: string): EventCount[] =>
  rows.filter((r) => r.key.startsWith(prefix));
