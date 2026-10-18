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
    rating: number;
    comment?: string | undefined;
  }): Promise<{ id: string; status: 'PENDING' }>;
  /** Approved reviews, newest first. */
  list(input: {
    salonId: string;
    staffId?: string | undefined;
    params: PaginationParams;
  }): Promise<ReviewList>;
  /** The latest approved reviews for the details pages. */
  latest(input: {
    salonId: string;
    staffId?: string | undefined;
    limit: number;
  }): Promise<ReviewView[]>;
}

export interface ReviewsDeps {
  readonly reviews: Pick<ReviewsRepository, 'create' | 'count' | 'findPage' | 'findMany'>;
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly members: Pick<MembersRepository, 'findOne'>;
  readonly customers: Pick<CustomersRepository, 'findById' | 'findMany'>;
  readonly settings: Pick<SettingsService, 'get'>;
}

export const createReviewsService = ({
  reviews,
  salons,
  members,
  customers,
  settings,
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

  /** A staff member of this salon who takes bookings; returns their rating. */
  const staffOf = async (
    salonId: string,
    staffId: string,
  ): Promise<{ avg: number; count: number }> => {
    const member = await members.findOne({
      _id: staffId,
      salonId,
      active: true,
      providesServices: true,
    });
    if (member?.staff === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return member.staff.rating;
  };

  const views = async (rows: readonly Entity<ReviewRaw>[]): Promise<ReviewView[]> => {
    const ids = [...new Set(rows.map((r) => r.customerId))];
    const people = ids.length === 0 ? [] : await customers.findMany({ _id: { $in: ids } });
    const names = new Map(people.map((c) => [c.id, c.firstName]));
    return rows.map((r) => ({
      id: r.id,
      customerName: names.get(r.customerId) ?? '',
      rating: r.rating,
      comment: r.comment ?? null,
      createdAt: r.createdAt,
    }));
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
    async submit({ customerId, salonId, staffId, rating, comment }) {
      const customer = await customers.findById(customerId);
      if (customer?.status !== 'ACTIVE') {
        throw new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
      }
      await visibleSalon(salonId);
      if (staffId !== undefined) await staffOf(salonId, staffId);
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
        customerId: toObjectId(customerId),
        rating,
        ...(comment === undefined || comment === '' ? {} : { comment }),
        status: 'PENDING',
      });
      return { id: created.id, status: 'PENDING' };
    },

    async list({ salonId, staffId, params }) {
      const summary = await visibleSalon(salonId).then((salon) =>
        staffId === undefined ? salon.rating : staffOf(salonId, staffId),
      );
      const page = await reviews.findPage(filterOf(salonId, staffId, 'APPROVED'), params, {
        createdAt: -1,
      });
      return { items: await views(page.items), meta: page.meta, summary };
    },

    async latest({ salonId, staffId, limit }) {
      const page = await reviews.findPage(
        filterOf(salonId, staffId, 'APPROVED'),
        { page: 1, pageSize: limit },
        { createdAt: -1 },
      );
      return views(page.items);
    },
  };
};
