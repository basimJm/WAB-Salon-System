import {
  REVIEW_STATUSES,
  REVIEW_TARGETS,
  type ReviewQuery,
  type ReviewStatus,
  type ReviewTarget,
} from '@/domain/reviews/reviews';
import type { ListState } from '@/domain/shared/listState';

export const RATINGS = [1, 2, 3, 4, 5];
const DEFAULT_STATUS: ReviewStatus = 'PENDING';

/** The URL list state -> the chosen filters and the API query (unknown values are dropped). */
export function reviewFilters(state: ListState): {
  status: ReviewStatus;
  target: ReviewTarget | undefined;
  rating: number | undefined;
  query: ReviewQuery;
} {
  const status = REVIEW_STATUSES.find((s) => s === state.filters['status']?.[0]) ?? DEFAULT_STATUS;
  const target = REVIEW_TARGETS.find((x) => x === state.filters['target']?.[0]);
  const rating = RATINGS.find((x) => String(x) === state.filters['rating']?.[0]);
  return {
    status,
    target,
    rating,
    query: {
      page: state.page,
      pageSize: state.pageSize,
      status,
      ...(target ? { target } : {}),
      ...(rating ? { rating } : {}),
    },
  };
}
