import type { ResolvedOptions } from './config/options';
import { countEvents } from './count';
import { IDENTITY_LINKED_EVENT } from './constants/defaults';
import { assertLink, buildEvent } from './event';
import { toAnalyticsError } from './errors';
import { cohorts } from './queries/cohorts';
import type { QueryContext } from './queries/context';
import { funnel } from './queries/funnel';
import { journey } from './queries/journey';
import { overview } from './queries/overview';
import { createQueryCache } from './cache/queryCache';
import type { EventStore, IdentityStore, ResultCache, WarehouseQuery } from './ports';
import { withRetry, type RetryHooks } from './retry';
import type { Analytics, IdentityLink, ServerEventInput } from './types';

export interface ServiceDeps {
  readonly options: ResolvedOptions;
  readonly events: EventStore;
  readonly identity: IdentityStore;
  readonly warehouse?: WarehouseQuery;
  readonly cache?: ResultCache;
  readonly now?: () => Date;
  readonly retryHooks?: RetryHooks;
}

/** Builds the public provider from its ports. Adapters are chosen by the factory, not here. */
export const createService = (deps: ServiceDeps): Analytics => {
  const { options, events, identity, warehouse } = deps;
  const context: QueryContext = { options, events, identity, warehouse };
  const queries = createQueryCache({
    cache: deps.cache,
    ttlSec: options.cache.ttlSec,
    staleSec: options.cache.staleSec,
    keyPrefix: options.cache.keyPrefix,
    logger: options.logger,
  });
  const now = deps.now ?? ((): Date => new Date());
  const run = <T>(task: () => Promise<T>): Promise<T> =>
    withRetry(task, options.retry, deps.retryHooks).catch((error: unknown) => {
      throw toAnalyticsError(error);
    });
  const track = async (input: ServerEventInput): Promise<boolean> => {
    try {
      const event = buildEvent(input, options, now());
      await run(() => events.append(event));
      return true;
    } catch (error) {
      options.logger.warn('analytics event not stored', {
        eventName: typeof input.name === 'string' ? input.name : undefined,
        error: toAnalyticsError(error).code,
      });
      return false;
    }
  };
  return {
    track,

    async linkIdentity(link: IdentityLink): Promise<void> {
      assertLink(link, options);
      await run(() => identity.link(link));
      if (options.trackIdentityEvent) {
        await track({
          name: IDENTITY_LINKED_EVENT,
          actorType: link.actorType,
          actorId: link.actorId,
          params: { installationId: link.installationId },
        });
      }
    },

    countEvents: (query) =>
      queries.wrap('count', query, () => run(() => countEvents(query, options, events, warehouse))),
    funnel: (definition) =>
      queries.wrap('funnel', definition, () => run(() => funnel(definition, context))),
    cohorts: (definition) =>
      queries.wrap('cohorts', definition, () => run(() => cohorts(definition, context))),
    journey: (actor, range, page) =>
      queries.wrap('journey', { actor, range, page }, () =>
        run(() => journey(actor, range, page, context)),
      ),
    overview: (range) => queries.wrap('overview', range, () => run(() => overview(range, context))),

    async init(): Promise<void> {
      await Promise.all([events.init?.(), identity.init?.(), warehouse?.init?.()]);
    },

    async close(): Promise<void> {
      await Promise.all([events.close?.(), identity.close?.(), warehouse?.close?.()]);
    },
  };
};
