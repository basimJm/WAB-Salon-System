import {
  REVIEW_STATUSES,
  REVIEW_TARGETS,
  type ReviewQuery,
  type ReviewStatus,
  type ReviewTarget,
} from '@/domain/reviews/reviews';
import type { ListState } from '@/domain/shared/listState';
import { businessTypeFilterOf, businessTypeParam } from '../shared/businessFilter';

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
  const salon = state.filters['salon']?.[0];
  const branch = state.filters['branch']?.[0];
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
      ...(salon ? { salonId: salon } : {}),
      ...(salon && branch ? { branchId: branch } : {}),
      ...businessTypeParam(businessTypeFilterOf(state)),
    },
  };
}
