import type { EventStore, StoreCountQuery, StoreFindQuery } from '../../ports';
import { dayKey } from '../../time';
import type { ActorRef, CountRow, StoredEvent } from '../../types';

const actorKey = (actor: ActorRef): string => `${actor.actorType}:${actor.actorId}`;

const compareKeys = (a: CountRow, b: CountRow): number =>
  a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

/** In-memory event store for development and tests. */
export class MemoryEventStore implements EventStore {
  private readonly events: StoredEvent[] = [];

  append(event: StoredEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  private matching(query: {
    names?: readonly string[] | undefined;
    from: Date;
    to: Date;
  }): StoredEvent[] {
    const wanted = new Set(query.names ?? []);
    return this.events.filter(
      (event) =>
        event.ts >= query.from &&
        event.ts < query.to &&
        (wanted.size === 0 || wanted.has(event.name)),
    );
  }

  count(query: StoreCountQuery): Promise<CountRow[]> {
    const counts = new Map<string, number>();
    for (const event of this.matching(query)) {
      const key = query.groupBy === 'NAME' ? event.name : dayKey(event.ts, query.timeZone);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Promise.resolve(
      [...counts.entries()].map(([key, count]) => ({ key, count })).sort(compareKeys),
    );
  }

  find(query: StoreFindQuery): Promise<StoredEvent[]> {
    const actors = query.actors === undefined ? undefined : new Set(query.actors.map(actorKey));
    const found = this.matching(query)
      .filter(
        (event) =>
          actors === undefined ||
          (event.actorId !== undefined &&
            actors.has(actorKey({ actorType: event.actorType, actorId: event.actorId }))),
      )
      .sort((a, b) => a.ts.getTime() - b.ts.getTime());
    if (query.order === 'desc') found.reverse();
    return Promise.resolve(found.slice(0, query.limit));
  }

  countActors(query: { names?: readonly string[]; from: Date; to: Date }): Promise<number> {
    const actors = new Set<string>();
    for (const event of this.matching(query)) {
      if (event.actorId !== undefined) {
        actors.add(actorKey({ actorType: event.actorType, actorId: event.actorId }));
      }
    }
    return Promise.resolve(actors.size);
  }
}
