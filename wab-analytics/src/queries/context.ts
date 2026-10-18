import type { ResolvedOptions } from '../config/options';
import { notConfiguredError } from '../errors';
import type { EventStore, IdentityStore, WarehouseQuery } from '../ports';
import type { EventSource } from '../types';
import { accountSubject, resolveAppSubjects } from './subjects';

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

interface Fetched {
  readonly items: StreamItem[];
  readonly scanned: number;
}

const fromServer = async (
  context: QueryContext,
  query: StreamQuery,
  limit: number,
): Promise<Fetched> => {
  const events = await context.events.find({
    names: query.names,
    from: query.from,
    to: query.to,
    limit,
    order: 'asc',
  });
  const items = events.flatMap((event) =>
    event.actorId === undefined
      ? []
      : [
          {
            subject: accountSubject(event as { actorType: string; actorId: string }),
            name: event.name,
            at: event.ts.getTime(),
          },
        ],
  );
  return { items, scanned: events.length };
};

const fromApp = async (
  context: QueryContext,
  query: StreamQuery,
  limit: number,
): Promise<Fetched> => {
  if (context.warehouse === undefined) throw notConfiguredError('no warehouse is configured');
  const events = await context.warehouse.findAppEvents({
    names: query.names,
    from: query.from,
    to: query.to,
    limit,
  });
  const subjects = await resolveAppSubjects(context.identity, events);
  const items = events.map((event, index) => ({
    subject: subjects[index] ?? '',
    name: event.name,
    at: event.ts.getTime(),
  }));
  return { items, scanned: events.length };
};

/**
 * Time-ordered events of the chosen source (`ALL` merges server and app events; installations
 * linked to accounts count as the account). At most `maxScannedEvents` are read per source; the
 * rest is reported as `truncated` instead of silently dropped.
 */
export const loadStream = async (context: QueryContext, query: StreamQuery): Promise<Stream> => {
  const max = context.options.limits.maxScannedEvents;
  const limit = max + 1;
  const parts: Fetched[] = [];
  if (query.source !== 'APP') parts.push(await fromServer(context, query, limit));
  if (query.source === 'APP' || query.source === 'ALL') {
    parts.push(await fromApp(context, query, limit));
  }
  const truncated = parts.some((part) => part.scanned >= limit);
  const items = parts
    .flatMap((part) => (part.scanned >= limit ? part.items.slice(0, max) : part.items))
    .sort((a, b) => a.at - b.at);
  return { items, truncated };
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
