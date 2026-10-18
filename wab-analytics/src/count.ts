import { EVENT_RULES, GROUPINGS } from './constants/defaults';
import type { ResolvedOptions } from './config/options';
import { notConfiguredError, validationError } from './errors';
import type { EventStore, StoreCountQuery, WarehouseQuery } from './ports';
import { assertRange } from './range';
import { isValidTimeZone } from './time';
import type { CountQuery, CountRow } from './types';

export const validateNames = (names: readonly string[] | undefined, maxNames: number): void => {
  if (names === undefined) return;
  if (names.length > maxNames) throw validationError('too many event names', { maxNames });
  if (!names.every((name) => EVENT_RULES.namePattern.test(name))) {
    throw validationError('invalid event name');
  }
};

/** Validates a count query and turns it into the query the stores understand. */
export const toStoreQuery = (query: CountQuery, options: ResolvedOptions): StoreCountQuery => {
  assertRange(query, options.limits.maxRangeDays);
  validateNames(query.names, options.limits.maxNames);
  if (!GROUPINGS.includes(query.groupBy)) throw validationError('unknown groupBy');
  const timeZone = query.timeZone ?? options.timeZone;
  if (!isValidTimeZone(timeZone)) throw validationError('unknown time zone');
  return {
    ...(query.names === undefined ? {} : { names: query.names }),
    from: query.from,
    to: query.to,
    groupBy: query.groupBy,
    timeZone,
  };
};

/** Counts server events (default) or app events (warehouse). */
export const countEvents = async (
  query: CountQuery,
  options: ResolvedOptions,
  events: EventStore,
  warehouse: WarehouseQuery | undefined,
): Promise<CountRow[]> => {
  const storeQuery = toStoreQuery(query, options);
  if (query.source === 'APP') {
    if (warehouse === undefined) throw notConfiguredError('no warehouse is configured');
    return (await warehouse.countAppEvents(storeQuery)).slice(0, options.limits.maxCountRows);
  }
  return (await events.count(storeQuery)).slice(0, options.limits.maxCountRows);
};
