import type { Redis } from 'ioredis';
import { createJsonCache } from '../../utils/redis/jsonCache';
import {
  ANALYTICS_CACHE_PREFIX,
  ANALYTICS_CACHE_TTL_SEC,
  ANALYTICS_MAX_RANGE_DAYS,
  ANALYTICS_SECTIONS,
  type AnalyticsSection,
} from '../../constants/analytics';
import type { AnalyticsGrouping } from '../../constants/providers';
import { MS_PER_DAY } from '../../constants/time';
import type { AnalyticsProvider, EventCountRow } from '../../providers/analytics';
import { ValidationError } from '../../utils/errors';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { Logger } from '../../utils/logger';
import type { SettingsService } from '../settings';

export type AnalyticsOverview = Record<AnalyticsSection, Record<string, number>>;

export interface AnalyticsService {
  events(input: {
    from: Date;
    to: Date;
    names?: readonly string[] | undefined;
    groupBy: AnalyticsGrouping;
  }): Promise<EventCountRow[]>;
  /** Counts of every dashboard event, grouped by section (zero for events that did not happen). */
  overview(input: { from: Date; to: Date }): Promise<AnalyticsOverview>;
}

const tooLong = (): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field: 'to',
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
      },
    ],
  });

export const createAnalyticsService = (deps: {
  analytics: AnalyticsProvider;
  settings: Pick<SettingsService, 'get'>;
  redis: Redis;
  logger: Logger;
}): AnalyticsService => {
  const checkRange = (from: Date, to: Date): void => {
    if (!(from < to) || to.getTime() - from.getTime() > ANALYTICS_MAX_RANGE_DAYS * MS_PER_DAY) {
      throw tooLong();
    }
  };

  /** Cache failures never break a dashboard: the query just runs again. */
  const cached = createJsonCache({
    redis: deps.redis,
    logger: deps.logger,
    prefix: ANALYTICS_CACHE_PREFIX,
    ttlSec: ANALYTICS_CACHE_TTL_SEC,
  });

  const count = async (
    from: Date,
    to: Date,
    names: readonly string[] | undefined,
    groupBy: AnalyticsGrouping,
  ): Promise<EventCountRow[]> =>
    deps.analytics.countEvents({
      from,
      to,
      groupBy,
      timeZone: await deps.settings.get('timezone'),
      ...(names === undefined ? {} : { names }),
    });

  return {
    events: ({ from, to, names, groupBy }) => {
      checkRange(from, to);
      const sorted = names === undefined ? [] : [...names].sort();
      return cached(
        `events:${groupBy}:${String(from.getTime())}:${String(to.getTime())}:${sorted.join(',')}`,
        () => count(from, to, sorted, groupBy),
      );
    },

    overview: ({ from, to }) => {
      checkRange(from, to);
      return cached(`overview:${String(from.getTime())}:${String(to.getTime())}`, async () => {
        const all = Object.values(ANALYTICS_SECTIONS).flat();
        const rows = await count(from, to, all, 'NAME');
        const byName = new Map(rows.map((row) => [row.key, row.count]));
        const result = {} as AnalyticsOverview;
        for (const [section, names] of Object.entries(ANALYTICS_SECTIONS)) {
          result[section as AnalyticsSection] = Object.fromEntries(
            names.map((name) => [name, byName.get(name) ?? 0]),
          );
        }
        return result;
      });
    },
  };
};
