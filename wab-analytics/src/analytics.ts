import { MemoryEventStore } from './adapters/memory/eventStore';
import { MemoryIdentityStore } from './adapters/memory/identityStore';
import { notConfiguredError } from './errors';
import { resolveOptions, type AnalyticsOptions, type ResolvedOptions } from './config/options';
import type { EventStore, IdentityStore, WarehouseQuery } from './ports';
import { createService } from './service';
import type { Analytics } from './types';

export interface Adapters {
  readonly events: EventStore;
  readonly identity: IdentityStore;
  readonly warehouse?: WarehouseQuery;
}

/** Chooses the adapters named by the options. Adding a vendor = one more branch here. */
export const buildAdapters = (options: ResolvedOptions): Adapters => {
  if (options.provider !== 'memory') throw notConfiguredError('this adapter is not available yet');
  return { events: new MemoryEventStore(), identity: new MemoryIdentityStore() };
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
