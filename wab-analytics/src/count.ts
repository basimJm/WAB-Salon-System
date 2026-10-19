import { EVENT_RULES, EVENT_SOURCES, GROUPINGS } from './constants/defaults';
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

const mergeRows = (lists: readonly CountRow[][]): CountRow[] => {
  const totals = new Map<string, number>();
  for (const row of lists.flat()) totals.set(row.key, (totals.get(row.key) ?? 0) + row.count);
  return [...totals.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
};

/** Counts server events (default), app events (`APP`) or both added together (`ALL`). */
export const countEvents = async (
  query: CountQuery,
  options: ResolvedOptions,
  events: EventStore,
  warehouse: WarehouseQuery | undefined,
): Promise<CountRow[]> => {
  const storeQuery = toStoreQuery(query, options);
  const source = query.source ?? 'SERVER';
  if (!EVENT_SOURCES.includes(source)) throw validationError('unknown source');
  if (source !== 'SERVER' && warehouse === undefined) {
    throw notConfiguredError('no warehouse is configured');
  }
  const lists: CountRow[][] = [];
  if (source !== 'APP') lists.push(await events.count(storeQuery));
  if (source !== 'SERVER' && warehouse !== undefined) {
    lists.push(await warehouse.countAppEvents(storeQuery));
  }
  return mergeRows(lists).slice(0, options.limits.maxCountRows);
};
