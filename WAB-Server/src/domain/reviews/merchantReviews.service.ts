import type { Language, ReviewTarget } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import {
  RATING_DECIMAL_SCALE,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
} from '../../constants/reviews';
import type { BranchesRepository } from '../../repositories/branches.repository';
import type {
  CustomersRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { ReviewsRepository } from '../../repositories/reviews.repository';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';
import { createReviewViews, type ReviewView } from './reviews.service';

export interface MerchantReviewView extends ReviewView {
  /** The staff member a STAFF review is about. */
  readonly staff: { id: string; firstName: string } | null;
}

export interface MerchantReviewSummary {
  readonly avg: number;
  readonly count: number;
  /** Published reviews per star, `"1"`…`"5"`. */
  readonly distribution: Record<string, number>;
}

export interface MerchantReviewsService {
  /** Published reviews of the caller's salon (M20), scoped to the caller's branch (§6). */
  list(input: {
    salonId: string;
    member: { id: string; branchId?: string | undefined };
    target: ReviewTarget;
    staffId?: string | undefined;
    /** Owner only: one branch; a branch member always sees their own. */
    branchId?: string | undefined;
    params: PaginationParams;
    language: Language;
  }): Promise<{
    items: MerchantReviewView[];
    meta: PaginationMeta;
    summary: MerchantReviewSummary;
  }>;
}

export interface MerchantReviewsDeps {
  readonly reviews: Pick<ReviewsRepository, 'findPage' | 'count'>;
  readonly members: Pick<MembersRepository, 'findOne'>;
  readonly customers: Pick<CustomersRepository, 'findMany'>;
  readonly branches?: Pick<BranchesRepository, 'findMany'>;
}

const STARS = Array.from(
  { length: REVIEW_RATING_MAX - REVIEW_RATING_MIN + 1 },
  (_, index) => REVIEW_RATING_MIN + index,
);

export const createMerchantReviewsService = (deps: MerchantReviewsDeps): MerchantReviewsService => {
  const { reviews, members } = deps;
  const views = createReviewViews(deps);

  /** The branch the list is limited to: the member's own; another one is refused. */
  const branchOf = (
    member: { branchId?: string | undefined },
    asked: string | undefined,
  ): string | undefined => {
    if (member.branchId === undefined) return asked;
    if (asked !== undefined && asked !== member.branchId) {
      throw new ForbiddenError({ code: ERROR_CODES.BRANCH_SCOPE_DENIED });
    }
    return member.branchId;
  };

  return {
    async list({ salonId, member, target, staffId, branchId, params, language }) {
      const branch = branchOf(member, branchId);
      let staff: { id: string; firstName: string } | null = null;
      if (target === 'STAFF') {
        const found =
          staffId === undefined ? null : await members.findOne({ _id: staffId, salonId });
        if (found === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
        // A branch member reads the reviews of their branch's staff only.
        if (member.branchId !== undefined && found.branchId !== member.branchId) {
          throw new ForbiddenError({ code: ERROR_CODES.BRANCH_SCOPE_DENIED });
        }
        staff = { id: found.id, firstName: found.firstName };
      }
      const filter: Record<string, unknown> = {
        salonId,
        target,
        status: 'APPROVED',
        ...(staff === null ? {} : { staffId: staff.id }),
        // Staff reviews follow the person; salon reviews are narrowed by their branch label.
        ...(staff === null && branch !== undefined ? { branchId: branch } : {}),
      };
      const [page, perStar] = await Promise.all([
        reviews.findPage(filter, params, { createdAt: -1 }),
        Promise.all(STARS.map((rating) => reviews.count({ ...filter, rating }))),
      ]);
      const count = perStar.reduce((total, n) => total + n, 0);
      const sum = perStar.reduce((total, n, index) => total + n * (STARS[index] ?? 0), 0);
      const items = await views(page.items, language);
      return {
        items: items.map((item) => ({ ...item, staff })),
        meta: page.meta,
        summary: {
          avg:
            count === 0
              ? 0
              : Math.round((sum / count) * RATING_DECIMAL_SCALE) / RATING_DECIMAL_SCALE,
          count,
          distribution: Object.fromEntries(
            STARS.map((star, index) => [String(star), perStar[index] ?? 0]),
          ),
        },
      };
    },
  };
};
