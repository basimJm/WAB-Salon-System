import { MemoryEventStore } from './adapters/memory/eventStore';
import { MemoryIdentityStore } from './adapters/memory/identityStore';
import { MemoryWarehouse } from './adapters/memory/warehouse';
import { MongoEventStore } from './adapters/mongo/eventStore';
import { MongoIdentityStore } from './adapters/mongo/identityStore';
import type { IdCodec, MongoCollectionLike } from './adapters/mongo/types';
import { resolveOptions, type AnalyticsOptions, type ResolvedOptions } from './config/options';
import type { EventStore, IdentityStore, WarehouseQuery } from './ports';
import { createService } from './service';
import type { Analytics } from './types';

export interface Adapters {
  readonly events: EventStore;
  readonly identity: IdentityStore;
  readonly warehouse?: WarehouseQuery;
}

const buildWarehouse = (options: ResolvedOptions): { warehouse?: WarehouseQuery } =>
  options.warehouse.provider === 'memory' ? { warehouse: new MemoryWarehouse() } : {};

/** Chooses the adapters named by the options. Adding a vendor = one more branch here. */
export const buildAdapters = (options: ResolvedOptions): Adapters => {
  const warehouse = buildWarehouse(options);
  if (options.provider === 'memory' || options.mongo === undefined) {
    return { events: new MemoryEventStore(), identity: new MemoryIdentityStore(), ...warehouse };
  }
  const { mongo } = options;
  const common = { maxTimeMs: options.queryTimeoutMs, ensureIndexes: mongo.ensureIndexes };
  return {
    events: new MongoEventStore({
      ...common,
      collection: mongo.events as MongoCollectionLike,
      ...(mongo.ids === undefined ? {} : { ids: mongo.ids as IdCodec }),
    }),
    identity: new MongoIdentityStore({
      ...common,
      collection: mongo.identityLinks as MongoCollectionLike,
    }),
    ...warehouse,
  };
};

/** The one factory consumers call. Throws `CONFIG_INVALID` for bad options. */
export const createAnalytics = (
  input: AnalyticsOptions,
  overrides: Partial<Adapters> = {},
): Analytics => {
  const options = resolveOptions(input);
  const adapters = { ...buildAdapters(options), ...overrides };
  return createService({ options, ...adapters });
};
