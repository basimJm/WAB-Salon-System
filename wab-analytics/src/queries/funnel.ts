import { DEFAULT_FUNNEL_WINDOW_MS, DEFAULT_LIMITS, EVENT_RULES } from '../constants/defaults';
import { validationError } from '../errors';
import { assertRange } from '../range';
import type { FunnelDefinition, FunnelResult, FunnelStepResult } from '../types';
import { bySubject, loadStream, type QueryContext, type StreamItem } from './context';

/** Conversion ratios are rounded to this many decimals. */
const RATIO_DECIMALS = 4;
const ratio = (part: number, whole: number): number =>
  whole === 0 ? 0 : Number((part / whole).toFixed(RATIO_DECIMALS));

const validate = (definition: FunnelDefinition, context: QueryContext): number => {
  const { limits } = context.options;
  assertRange(definition, limits.maxRangeDays);
  const count = definition.steps.length;
  if (count < DEFAULT_LIMITS.minFunnelSteps || count > limits.maxFunnelSteps) {
    throw validationError('a funnel needs between 2 and the maximum number of steps', {
      max: limits.maxFunnelSteps,
    });
  }
  if (!definition.steps.every((step) => EVENT_RULES.namePattern.test(step))) {
    throw validationError('invalid event name');
  }
  const drop = definition.dropOffUsers ?? 0;
  if (!Number.isInteger(drop) || drop < 0 || drop > DEFAULT_LIMITS.maxDropOffUsers) {
    throw validationError('dropOffUsers is out of range');
  }
  const window = definition.windowMs ?? DEFAULT_FUNNEL_WINDOW_MS;
  if (!Number.isInteger(window) || window <= 0) throw validationError('windowMs must be positive');
  return window;
};

/** Times of the best ordered attempt of one subject (index = step). */
const bestAttempt = (
  items: readonly StreamItem[],
  steps: readonly string[],
  windowMs: number,
): number[] => {
  let best: number[] = [];
  let current: number[] = [];
  for (const item of items) {
    if (current.length > 0 && item.at - (current[0] ?? 0) > windowMs) current = [];
    if (item.name === steps[current.length]) current.push(item.at);
    else if (current.length > 0 && item.name === steps[0] && current.length === 1)
      current = [item.at];
    if (current.length > best.length) best = [...current];
    if (current.length === steps.length) break;
  }
  return best;
};

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
};

/** Ordered-step funnel: users per step, conversion, drop-off, median time and drop-off lists. */
export const funnel = async (
  definition: FunnelDefinition,
  context: QueryContext,
): Promise<FunnelResult> => {
  const windowMs = validate(definition, context);
  const { steps } = definition;
  const stream = await loadStream(context, {
    names: [...new Set(steps)],
    from: definition.from,
    to: definition.to,
    source: definition.source,
  });
  const attempts = [...bySubject(stream.items)].map(
    ([subject, items]) => [subject, bestAttempt(items, steps, windowMs)] as const,
  );
  const first = attempts.filter(([, times]) => times.length > 0).length;
  const wantedDrop = definition.dropOffUsers ?? 0;
  const results: FunnelStepResult[] = steps.map((name, index) => {
    const reached = attempts.filter(([, times]) => times.length > index);
    const gaps = reached.map(([, times]) => (times[index] ?? 0) - (times[index - 1] ?? 0));
    const previous =
      index === 0 ? reached.length : attempts.filter(([, t]) => t.length > index - 1).length;
    const lost = attempts
      .filter(([, times]) => index > 0 && times.length === index)
      .map(([subject]) => subject)
      .sort();
    return {
      name,
      users: reached.length,
      conversionFromPrevious: index === 0 ? (first === 0 ? 0 : 1) : ratio(reached.length, previous),
      conversionFromFirst: ratio(reached.length, first),
      dropOff: index === 0 ? 0 : previous - reached.length,
      medianMsFromPrevious: index === 0 ? null : median(gaps),
      dropOffUsers: lost.slice(0, wantedDrop),
    };
  });
  return { steps: results, truncated: stream.truncated };
};
