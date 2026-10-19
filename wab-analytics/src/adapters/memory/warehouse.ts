import type {
  AppEvent,
  CrashEvent,
  StoreCountQuery,
  WarehouseFindQuery,
  WarehouseQuery,
} from '../../ports';
import { dayKey } from '../../time';
import type { CountRow } from '../../types';

interface Range {
  readonly from: Date;
  readonly to: Date;
}

const inRange = (ts: Date, range: Range): boolean => ts >= range.from && ts < range.to;

const owned = (
  item: { installationId?: string | undefined; userId?: string | undefined },
  query: Pick<WarehouseFindQuery, 'installationIds' | 'userIds'>,
): boolean => {
  if (query.installationIds === undefined && query.userIds === undefined) return true;
  return (
    (item.installationId !== undefined &&
      (query.installationIds ?? []).includes(item.installationId)) ||
    (item.userId !== undefined && (query.userIds ?? []).includes(item.userId))
  );
};

/** In-memory stand-in for the Firebase exports in BigQuery (development and tests). */
export class MemoryWarehouse implements WarehouseQuery {
  readonly appEvents: AppEvent[] = [];
  readonly crashes: CrashEvent[] = [];

  addAppEvent(event: AppEvent): void {
    this.appEvents.push(event);
  }

  addCrash(crash: CrashEvent): void {
    this.crashes.push(crash);
  }

  private apps(query: Range & { names?: readonly string[] | undefined }): AppEvent[] {
    const wanted = new Set(query.names ?? []);
    return this.appEvents.filter(
      (event) => inRange(event.ts, query) && (wanted.size === 0 || wanted.has(event.name)),
    );
  }

  countAppEvents(query: StoreCountQuery): Promise<CountRow[]> {
    const counts = new Map<string, number>();
    for (const event of this.apps(query)) {
      const key = query.groupBy === 'NAME' ? event.name : dayKey(event.ts, query.timeZone);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Promise.resolve(
      [...counts.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
    );
  }

  findAppEvents(query: WarehouseFindQuery): Promise<AppEvent[]> {
    return Promise.resolve(
      this.apps(query)
        .filter((event) => owned(event, query))
        .sort((a, b) => a.ts.getTime() - b.ts.getTime())
        .slice(0, query.limit),
    );
  }

  findCrashes(query: Omit<WarehouseFindQuery, 'names'>): Promise<CrashEvent[]> {
    return Promise.resolve(
      this.crashes
        .filter((crash) => inRange(crash.ts, query) && owned(crash, query))
        .sort((a, b) => a.ts.getTime() - b.ts.getTime())
        .slice(0, query.limit),
    );
  }

  countAppActors(query: { names?: readonly string[]; from: Date; to: Date }): Promise<number> {
    return Promise.resolve(
      new Set(this.apps(query).map((event) => event.userId ?? event.installationId)).size,
    );
  }
}
