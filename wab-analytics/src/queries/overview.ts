import { toStoreQuery } from '../count';
import type { Overview } from '../types';
import type { QueryContext } from './context';

/** Totals, unique actors, top events and the daily series of a range. */
export const overview = async (
  range: { from: Date; to: Date },
  context: QueryContext,
): Promise<Overview> => {
  const { options, events, warehouse } = context;
  const byName = toStoreQuery({ ...range, groupBy: 'NAME' }, options);
  const byDay = toStoreQuery({ ...range, groupBy: 'DAY' }, options);
  const [names, daily, uniqueActors, installations] = await Promise.all([
    events.count(byName),
    events.count(byDay),
    events.countActors(range),
    warehouse === undefined ? Promise.resolve(null) : warehouse.countAppActors(range),
  ]);
  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    totalEvents: names.reduce((sum, row) => sum + row.count, 0),
    uniqueActors,
    activeInstallations: installations,
    topEvents: [...names]
      .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1))
      .slice(0, options.limits.topEvents),
    daily: daily.slice(0, options.limits.maxCountRows),
  };
};
