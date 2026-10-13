import { z } from 'zod';
import { ANALYTICS_MAX_NAMES } from '../../../constants/analytics';
import { EVENT_NAME_PATTERN } from '../../../constants/audit';
import { ANALYTICS_GROUPINGS } from '../../../constants/providers';

const instant = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
const range = { from: instant, to: instant };

export const overviewQuery = z.object(range);
export const eventsQuery = z.object({
  ...range,
  groupBy: z.enum(ANALYTICS_GROUPINGS).default('NAME'),
  /** Comma separated event names; absent = all. */
  names: z
    .string()
    .transform((value) => value.split(',').filter((name) => name !== ''))
    .pipe(z.array(z.string().regex(EVENT_NAME_PATTERN)).max(ANALYTICS_MAX_NAMES))
    .optional(),
});
