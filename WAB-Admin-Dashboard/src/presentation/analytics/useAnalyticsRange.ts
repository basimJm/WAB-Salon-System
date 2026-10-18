import { useMemo, useState } from 'react';
import {
  initialRangeValue,
  previousPeriod,
  rangeToInstants,
  type DateRangeValue,
} from '@/domain/shared/dateRange';

export interface InstantPair {
  from: string;
  to: string;
}

/** The range the admin picked as API instants, and the one right before it when comparing. */
export function useAnalyticsRange() {
  const [value, setValue] = useState<DateRangeValue>(() => initialRangeValue(new Date()));
  const current = useMemo<InstantPair>(() => {
    const r = rangeToInstants(value);
    return { from: r.start.toISOString(), to: r.end.toISOString() };
  }, [value]);
  const previous = useMemo<InstantPair | null>(() => {
    if (!value.compare) return null;
    const r = rangeToInstants(previousPeriod(value));
    return { from: r.start.toISOString(), to: r.end.toISOString() };
  }, [value]);
  return { value, setValue, current, previous };
}
