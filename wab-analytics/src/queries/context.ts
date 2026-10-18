import type { ResolvedOptions } from '../config/options';
import { notConfiguredError } from '../errors';
import type { EventStore, IdentityStore, WarehouseQuery } from '../ports';
import type { EventSource } from '../types';

/** What every query needs: validated options and the ports. */
export interface QueryContext {
  readonly options: ResolvedOptions;
  readonly events: EventStore;
  readonly identity: IdentityStore;
  readonly warehouse?: WarehouseQuery | undefined;
}

/** One event reduced to what funnels and cohorts need. */
export interface StreamItem {
  readonly subject: string;
  readonly name: string;
  readonly at: number;
}

export interface Stream {
  readonly items: readonly StreamItem[];
  readonly truncated: boolean;
}

export interface StreamQuery {
  readonly names: readonly string[];
  readonly from: Date;
  readonly to: Date;
  readonly source: EventSource | undefined;
}

/**
 * Time-ordered events of the chosen source. At most `maxScannedEvents` are read; the rest is
 * reported as `truncated` instead of silently dropped.
 */
export const loadStream = async (context: QueryContext, query: StreamQuery): Promise<Stream> => {
  const limit = context.options.limits.maxScannedEvents + 1;
  let items: StreamItem[];
  let scanned: number;
  if (query.source === 'APP') {
    if (context.warehouse === undefined) throw notConfiguredError('no warehouse is configured');
    const events = await context.warehouse.findAppEvents({
      names: query.names,
      from: query.from,
      to: query.to,
      limit,
    });
    scanned = events.length;
    items = events.map((event) => ({
      subject: event.userId === undefined ? `inst:${event.installationId}` : `user:${event.userId}`,
      name: event.name,
      at: event.ts.getTime(),
    }));
  } else {
    const events = await context.events.find({
      names: query.names,
      from: query.from,
      to: query.to,
      limit,
      order: 'asc',
    });
    scanned = events.length;
    items = events.flatMap((event) =>
      event.actorId === undefined
        ? []
        : [
            {
              subject: `${event.actorType}:${event.actorId}`,
              name: event.name,
              at: event.ts.getTime(),
            },
          ],
    );
  }
  const truncated = scanned >= limit;
  return { items: truncated ? items.slice(0, limit - 1) : items, truncated };
};

/** Groups a time-ordered stream by subject (order inside a subject is kept). */
export const bySubject = (items: readonly StreamItem[]): Map<string, StreamItem[]> => {
  const groups = new Map<string, StreamItem[]>();
  for (const item of items) {
    const list = groups.get(item.subject);
    if (list === undefined) groups.set(item.subject, [item]);
    else list.push(item);
  }
  return groups;
};
