import {
  HOME_BOOK_AGAIN_SCAN,
  HOME_BOOK_AGAIN_STATUSES,
  HOME_EXPLORE_CANDIDATES,
  HOME_POPULARITY_CACHE_MS,
  HOME_POPULARITY_DAYS,
} from '../../constants/home';
import { MS_PER_DAY } from '../../constants/time';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { Logger } from '../../utils/logger';
import type { CatalogPopularity, PastVisits } from './home.service';

/**
 * The *Explore* order from recent bookings (§5.22): one aggregate, cached for every request; a
 * failure keeps the previous order (or none), so the home page never fails on it.
 */
export const createCatalogPopularity = (deps: {
  readonly bookings: Pick<BookingsRepository, 'catalogPopularity'>;
  readonly logger: Logger;
  readonly now?: () => Date;
}): CatalogPopularity => {
  const now = deps.now ?? ((): Date => new Date());
  let cached: { at: number; ids: readonly string[] } | null = null;
  return {
    async rank() {
      const at = now().getTime();
      if (cached !== null && at - cached.at < HOME_POPULARITY_CACHE_MS) return cached.ids;
      try {
        const ids = await deps.bookings.catalogPopularity(
          new Date(at - HOME_POPULARITY_DAYS * MS_PER_DAY),
          HOME_EXPLORE_CANDIDATES,
        );
        cached = { at, ids };
        return ids;
      } catch (error) {
        deps.logger.warn({ err: error }, 'explore popularity unavailable');
        return cached?.ids ?? [];
      }
    },
  };
};

/** *Book again* from the customer's completed bookings (§5.22). */
export const createPastVisits = (
  bookings: Pick<BookingsRepository, 'recentVisits'>,
): PastVisits => ({
  recent: (customerId, limit) =>
    bookings.recentVisits(customerId, HOME_BOOK_AGAIN_STATUSES, limit, HOME_BOOK_AGAIN_SCAN),
});
