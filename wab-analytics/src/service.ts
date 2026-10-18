import type { ResolvedOptions } from './config/options';
import { countEvents } from './count';
import { IDENTITY_LINKED_EVENT } from './constants/defaults';
import { assertLink, buildEvent } from './event';
import { notConfiguredError, toAnalyticsError } from './errors';
import type { EventStore, IdentityStore, WarehouseQuery } from './ports';
import { withRetry, type RetryHooks } from './retry';
import type { Analytics, IdentityLink, ServerEventInput } from './types';

export interface ServiceDeps {
  readonly options: ResolvedOptions;
  readonly events: EventStore;
  readonly identity: IdentityStore;
  readonly warehouse?: WarehouseQuery;
  readonly now?: () => Date;
  readonly retryHooks?: RetryHooks;
}

const PENDING = 'query is not available yet';

/** Builds the public provider from its ports. Adapters are chosen by the factory, not here. */
export const createService = (deps: ServiceDeps): Analytics => {
  const { options, events, identity, warehouse } = deps;
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

    countEvents: (query) => run(() => countEvents(query, options, events, warehouse)),
    funnel: () => Promise.reject(notConfiguredError(PENDING)),
    cohorts: () => Promise.reject(notConfiguredError(PENDING)),
    journey: () => Promise.reject(notConfiguredError(PENDING)),
    overview: () => Promise.reject(notConfiguredError(PENDING)),

    async init(): Promise<void> {
      await Promise.all([events.init?.(), identity.init?.(), warehouse?.init?.()]);
    },

    async close(): Promise<void> {
      await Promise.all([events.close?.(), identity.close?.(), warehouse?.close?.()]);
    },
  };
};
