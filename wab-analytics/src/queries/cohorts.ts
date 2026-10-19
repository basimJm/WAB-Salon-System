import { COHORT_UNITS, DAYS_PER_WEEK, EVENT_RULES, MS_PER_DAY } from '../constants/defaults';
import { validationError } from '../errors';
import { assertRange } from '../range';
import { dayKey, isValidTimeZone } from '../time';
import type { CohortDefinition, CohortResult, CohortRow, CohortUnit } from '../types';
import { bySubject, loadStream, type QueryContext } from './context';

/** 1970-01-05 (day index 4) was a Monday: weeks start on Monday. */
const FIRST_MONDAY_INDEX = 4;

const dayIndex = (key: string): number => Math.floor(Date.parse(`${key}T00:00:00Z`) / MS_PER_DAY);

const periodIndex = (key: string, unit: CohortUnit): number =>
  unit === 'DAY' ? dayIndex(key) : Math.floor((dayIndex(key) - FIRST_MONDAY_INDEX) / DAYS_PER_WEEK);

const periodLabel = (index: number, unit: CohortUnit): string => {
  const day = unit === 'DAY' ? index : index * DAYS_PER_WEEK + FIRST_MONDAY_INDEX;
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
};

const periodDays = (unit: CohortUnit): number => (unit === 'DAY' ? 1 : DAYS_PER_WEEK);

const validate = (definition: CohortDefinition, context: QueryContext): string => {
  const { limits } = context.options;
  assertRange(definition, limits.maxRangeDays);
  const { startEvent, returnEvent, periods, unit } = definition;
  if (!EVENT_RULES.namePattern.test(startEvent) || !EVENT_RULES.namePattern.test(returnEvent)) {
    throw validationError('invalid event name');
  }
  if (!COHORT_UNITS.includes(unit)) throw validationError('unknown cohort unit');
  if (!Number.isInteger(periods) || periods < 1 || periods > limits.maxCohortPeriods) {
    throw validationError('periods is out of range', { max: limits.maxCohortPeriods });
  }
  const timeZone = definition.timeZone ?? context.options.timeZone;
  if (!isValidTimeZone(timeZone)) throw validationError('unknown time zone');
  return timeZone;
};

/**
 * Retention: actors join the cohort of the period of their first `startEvent` inside the range;
 * `retained[k]` counts those who did `returnEvent` in the period `k + 1` periods later.
 */
export const cohorts = async (
  definition: CohortDefinition,
  context: QueryContext,
): Promise<CohortResult> => {
  const timeZone = validate(definition, context);
  const { unit, periods } = definition;
  const lookahead = periods * periodDays(unit) * MS_PER_DAY;
  const stream = await loadStream(context, {
    names: [...new Set([definition.startEvent, definition.returnEvent])],
    from: definition.from,
    to: new Date(definition.to.getTime() + lookahead),
    source: definition.source,
  });
  const rows = new Map<number, { size: number; retained: Set<string>[] }>();
  for (const items of bySubject(stream.items).values()) {
    const start = items.find(
      (item) =>
        item.name === definition.startEvent &&
        item.at >= definition.from.getTime() &&
        item.at < definition.to.getTime(),
    );
    if (start === undefined) continue;
    const cohort = periodIndex(dayKey(new Date(start.at), timeZone), unit);
    const row = rows.get(cohort) ?? {
      size: 0,
      retained: Array.from({ length: periods }, () => new Set<string>()),
    };
    row.size += 1;
    for (const item of items) {
      if (item.name !== definition.returnEvent || item.at < start.at) continue;
      const offset = periodIndex(dayKey(new Date(item.at), timeZone), unit) - cohort;
      if (offset >= 1 && offset <= periods) row.retained[offset - 1]?.add(items[0]?.subject ?? '');
    }
    rows.set(cohort, row);
  }
  const result: CohortRow[] = [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([cohort, row]) => ({
      cohort: periodLabel(cohort, unit),
      size: row.size,
      retained: row.retained.map((set) => set.size),
    }));
  return { unit, cohorts: result, truncated: stream.truncated };
};
