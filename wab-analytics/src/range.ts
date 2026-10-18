import { MS_PER_DAY } from './constants/defaults';
import { rangeError } from './errors';

export interface DateRange {
  /** Inclusive start. */
  readonly from: Date;
  /** Exclusive end. */
  readonly to: Date;
}

const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

/** Half-open `[from, to)` range: valid dates, `to` after `from`, span within the limit. */
export const assertRange = (range: DateRange, maxRangeDays: number): void => {
  if (!isValidDate(range.from) || !isValidDate(range.to)) {
    throw rangeError('from and to must be valid dates');
  }
  if (range.to.getTime() <= range.from.getTime()) throw rangeError('to must be after from');
  if (range.to.getTime() - range.from.getTime() > maxRangeDays * MS_PER_DAY) {
    throw rangeError('range is longer than the allowed maximum', { maxRangeDays });
  }
};
