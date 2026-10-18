import type { Logger } from '../logger';
import type { ResultCache } from '../ports';
import { cacheKey } from './keys';

const MS_PER_SECOND = 1000;

export interface QueryCache {
  /** Returns the cached answer for `(kind, input)` or computes, stores and returns it. */
  wrap<T>(kind: string, input: unknown, compute: () => Promise<T>): Promise<T>;
}

export interface QueryCacheOptions {
  readonly cache: ResultCache | undefined;
  readonly ttlSec: number;
  /** Extra seconds a stale answer may be served while a refresh runs (0 = off). */
  readonly staleSec: number;
  readonly keyPrefix: string;
  readonly logger: Logger;
  readonly now?: () => number;
}

interface Envelope {
  readonly at: number;
  readonly value: unknown;
}

const parse = (text: string): Envelope | undefined => {
  try {
    const parsed = JSON.parse(text) as Partial<Envelope> | null;
    return typeof parsed?.at === 'number' && 'value' in parsed
      ? { at: parsed.at, value: parsed.value }
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Caches query answers by a hash of the query. A cache failure is logged and ignored (the query
 * simply runs), equal concurrent misses share one computation, and with `staleSec` an expired
 * answer is served once while it refreshes in the background.
 */
export const createQueryCache = (options: QueryCacheOptions): QueryCache => {
  const { cache, logger } = options;
  const now = options.now ?? Date.now;
  const inflight = new Map<string, Promise<unknown>>();

  const compute = <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const running = inflight.get(key) as Promise<T> | undefined;
    if (running !== undefined) return running;
    const started = (async (): Promise<T> => {
      const value = await task();
      try {
        const envelope: Envelope = { at: now(), value };
        await cache?.set(key, JSON.stringify(envelope), options.ttlSec + options.staleSec);
      } catch (error) {
        logger.warn('analytics cache write failed', { error: String(error) });
      }
      return value;
    })().finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, started);
    return started;
  };

  return {
    async wrap<T>(kind: string, input: unknown, task: () => Promise<T>): Promise<T> {
      if (cache === undefined) return task();
      const key = cacheKey(options.keyPrefix, kind, input);
      let envelope: Envelope | undefined;
      try {
        const text = await cache.get(key);
        envelope = text === undefined ? undefined : parse(text);
      } catch (error) {
        logger.warn('analytics cache read failed', { error: String(error) });
      }
      if (envelope !== undefined) {
        const ageMs = now() - envelope.at;
        if (ageMs < options.ttlSec * MS_PER_SECOND) return envelope.value as T;
        if (ageMs < (options.ttlSec + options.staleSec) * MS_PER_SECOND) {
          compute(key, task).catch((error: unknown) => {
            logger.warn('analytics cache refresh failed', { error: String(error) });
          });
          return envelope.value as T;
        }
      }
      return compute(key, task);
    },
  };
};
