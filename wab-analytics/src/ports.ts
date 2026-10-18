import type { ActorRef, CountRow, Grouping, IdentityLink, StoredEvent } from './types';

export interface StoreCountQuery {
  readonly names?: readonly string[];
  readonly from: Date;
  readonly to: Date;
  readonly groupBy: Grouping;
  readonly timeZone: string;
}

export interface StoreFindQuery {
  readonly names?: readonly string[];
  readonly from: Date;
  readonly to: Date;
  /** Only events of these actors (all when missing). */
  readonly actors?: readonly ActorRef[];
  readonly limit: number;
  readonly order: 'asc' | 'desc';
}

export interface Lifecycle {
  /** Creates indexes / checks connectivity. Idempotent. */
  init?(): Promise<void>;
  close?(): Promise<void>;
}

/** Server events (MongoDB today). Swap the vendor by adding another adapter. */
export interface EventStore extends Lifecycle {
  append(event: StoredEvent): Promise<void>;
  count(query: StoreCountQuery): Promise<CountRow[]>;
  /** Events in `[from, to)` ordered by time. */
  find(query: StoreFindQuery): Promise<StoredEvent[]>;
  /** Distinct actors with at least one matching event. */
  countActors(query: { names?: readonly string[]; from: Date; to: Date }): Promise<number>;
}

/** Installation ↔ account links. */
export interface IdentityStore extends Lifecycle {
  /** Idempotent: linking the same triple twice stores one link. */
  link(link: IdentityLink): Promise<void>;
  linksOfActor(actor: ActorRef): Promise<IdentityLink[]>;
  linksOfInstallations(installationIds: readonly string[]): Promise<IdentityLink[]>;
}

export type ParamValue = string | number | boolean | null;

/** One Firebase Analytics event from the BigQuery export. */
export interface AppEvent {
  readonly ts: Date;
  readonly name: string;
  readonly installationId: string;
  readonly userId?: string;
  readonly platform?: string;
  readonly appVersion?: string;
  readonly screen?: string;
  readonly params: Readonly<Record<string, ParamValue>>;
}

/** One Crashlytics event from the BigQuery export. */
export interface CrashEvent {
  readonly ts: Date;
  readonly issueId: string;
  readonly title?: string;
  readonly installationId?: string;
  readonly userId?: string;
  readonly platform?: string;
  readonly appVersion?: string;
}

export interface WarehouseFindQuery {
  readonly names?: readonly string[];
  readonly from: Date;
  readonly to: Date;
  readonly installationIds?: readonly string[];
  readonly userIds?: readonly string[];
  readonly limit: number;
}

/** App-side analytics (BigQuery today). Same idea as the event store: swap by adapter. */
export interface WarehouseQuery extends Lifecycle {
  countAppEvents(query: StoreCountQuery): Promise<CountRow[]>;
  findAppEvents(query: WarehouseFindQuery): Promise<AppEvent[]>;
  findCrashes(query: Omit<WarehouseFindQuery, 'names'>): Promise<CrashEvent[]>;
  countAppActors(query: { names?: readonly string[]; from: Date; to: Date }): Promise<number>;
}
