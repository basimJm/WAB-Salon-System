import type { Language } from '../../constants/enums';
import { DEFAULT_LANGUAGE } from '../../constants/i18n';
import type { BranchesRepository } from '../../repositories/branches.repository';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { ReviewStatus, ReviewTarget } from '../../constants/enums';
import type { ReviewRaw } from '../../models/review.model';
import type {
  CustomersRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { ReviewsRepository } from '../../repositories/reviews.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { ForbiddenError, NotFoundError, RateLimitError } from '../../utils/errors';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';
import type { SettingsService } from '../settings';

export interface ReviewView {
  readonly id: string;
  /** First name only. */
  readonly customerName: string;
  readonly rating: number;
  readonly comment: string | null;
  readonly createdAt: Date;
  /** Label only (§5.11): the branch the review is about, in the request language. */
  readonly branch: { id: string; name: string } | null;
}

export interface ReviewList {
  readonly items: ReviewView[];
  readonly meta: PaginationMeta;
  readonly summary: { avg: number; count: number };
}

export interface ReviewsService {
  /** A new review waits for admin approval (PENDING). */
  submit(input: {
    customerId: string;
    salonId: string;
    staffId?: string | undefined;
    /** The branch picked by the customer; a staff review takes the staff member's branch. */
    branchId?: string | undefined;
    rating: number;
    comment?: string | undefined;
  }): Promise<{ id: string; status: 'PENDING' }>;
  /** Approved reviews, newest first. */
  list(input: {
    salonId: string;
    staffId?: string | undefined;
    params: PaginationParams;
    language?: Language | undefined;
  }): Promise<ReviewList>;
  /** The latest approved reviews for the details pages. */
  latest(input: {
    salonId: string;
    staffId?: string | undefined;
    limit: number;
    language?: Language | undefined;
  }): Promise<ReviewView[]>;
}

export interface ReviewsDeps {
  readonly reviews: Pick<ReviewsRepository, 'create' | 'count' | 'findPage' | 'findMany'>;
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly members: Pick<MembersRepository, 'findOne'>;
  readonly customers: Pick<CustomersRepository, 'findById' | 'findMany'>;
  readonly settings: Pick<SettingsService, 'get'>;
  /** Branch labels (§5.11); without it reviews carry no branch. */
  readonly branches?: Pick<BranchesRepository, 'findMany' | 'findInSalon'>;
}

export const createReviewsService = ({
  reviews,
  salons,
  members,
  customers,
  settings,
  branches,
}: ReviewsDeps): ReviewsService => {
  const targetOf = (staffId: string | undefined): ReviewTarget =>
    staffId === undefined ? 'SALON' : 'STAFF';

  const visibleSalon = async (
    salonId: string,
  ): Promise<{ rating: { avg: number; count: number } }> => {
    const salon = await salons.findById(salonId);
    if (salon?.state !== 'LIVE' || !salon.completeness.isComplete) {
      throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    }
    return salon;
  };

  /** A staff member of this salon who takes bookings: their rating and branch. */
  const staffMember = async (
    salonId: string,
    staffId: string,
  ): Promise<{ rating: { avg: number; count: number }; branchId: string | undefined }> => {
    const member = await members.findOne({
      _id: staffId,
      salonId,
      active: true,
      providesServices: true,
    });
    if (member?.staff === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return { rating: member.staff.rating, branchId: member.branchId };
  };
  const staffOf = async (
    salonId: string,
    staffId: string,
  ): Promise<{ avg: number; count: number }> => (await staffMember(salonId, staffId)).rating;

  /**
   * The branch a new review is labelled with (§5.11): the staff member's branch for a staff
   * review, else the one the customer picked (an open branch of that salon), else none.
   */
  const branchFor = async (
    salonId: string,
    staffBranchId: string | undefined,
    picked: string | undefined,
  ): Promise<string | undefined> => {
    if (staffBranchId !== undefined) {
      if (picked !== undefined && picked !== staffBranchId) {
        throw new NotFoundError({ code: ERROR_CODES.BRANCH_NOT_FOUND });
      }
      return staffBranchId;
    }
    if (picked === undefined || branches === undefined) return undefined;
    const branch = await branches.findInSalon(salonId, picked);
    if (branch === null || branch.status === 'CLOSED') {
      throw new NotFoundError({ code: ERROR_CODES.BRANCH_NOT_FOUND });
    }
    return branch.id;
  };

  const views = async (
    rows: readonly Entity<ReviewRaw>[],
    language: Language,
  ): Promise<ReviewView[]> => {
    const ids = [...new Set(rows.map((r) => r.customerId))];
    const branchIds = [
      ...new Set(rows.flatMap((r) => (r.branchId === undefined ? [] : [r.branchId]))),
    ];
    const [people, labels] = await Promise.all([
      ids.length === 0 ? [] : customers.findMany({ _id: { $in: ids } }),
      branchIds.length === 0 || branches === undefined
        ? []
        : branches.findMany({ _id: { $in: branchIds } }),
    ]);
    const names = new Map(people.map((c) => [c.id, c.firstName]));
    const branchNames = new Map(labels.map((b) => [b.id, b.name[language]]));
    return rows.map((r) => {
      const branchName = r.branchId === undefined ? undefined : branchNames.get(r.branchId);
      return {
        id: r.id,
        customerName: names.get(r.customerId) ?? '',
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.createdAt,
        branch:
          r.branchId === undefined || branchName === undefined
            ? null
            : { id: r.branchId, name: branchName },
      };
    });
  };

  const filterOf = (
    salonId: string,
    staffId: string | undefined,
    status: ReviewStatus,
  ): Record<string, unknown> => ({
    salonId,
    target: targetOf(staffId),
    status,
    ...(staffId === undefined ? {} : { staffId }),
  });

  return {
    async submit({ customerId, salonId, staffId, branchId, rating, comment }) {
      const customer = await customers.findById(customerId);
      if (customer?.status !== 'ACTIVE') {
        throw new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
      }
      await visibleSalon(salonId);
      const staffBranchId =
        staffId === undefined ? undefined : (await staffMember(salonId, staffId)).branchId;
      const branch = await branchFor(salonId, staffBranchId, branchId);
      const max = await settings.get('reviews.maxPendingPerTargetPerCustomer');
      const pending = await reviews.count({
        customerId,
        ...filterOf(salonId, staffId, 'PENDING'),
      });
      if (pending >= max) throw new RateLimitError();
      const created = await reviews.create({
        target: targetOf(staffId),
        salonId: toObjectId(salonId),
        ...(staffId === undefined ? {} : { staffId: toObjectId(staffId) }),
        ...(branch === undefined ? {} : { branchId: toObjectId(branch) }),
        customerId: toObjectId(customerId),
        rating,
        ...(comment === undefined || comment === '' ? {} : { comment }),
        status: 'PENDING',
      });
      return { id: created.id, status: 'PENDING' };
    },

    async list({ salonId, staffId, params, language = DEFAULT_LANGUAGE }) {
      const summary = await visibleSalon(salonId).then((salon) =>
        staffId === undefined ? salon.rating : staffOf(salonId, staffId),
      );
      const page = await reviews.findPage(filterOf(salonId, staffId, 'APPROVED'), params, {
        createdAt: -1,
      });
      return { items: await views(page.items, language), meta: page.meta, summary };
    },

    async latest({ salonId, staffId, limit, language = DEFAULT_LANGUAGE }) {
      const page = await reviews.findPage(
        filterOf(salonId, staffId, 'APPROVED'),
        { page: 1, pageSize: limit },
        { createdAt: -1 },
      );
      return views(page.items, language);
    },
  };
};
