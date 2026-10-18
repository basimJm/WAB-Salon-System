import {
  REVIEW_DEFAULT_REASONS,
  RATING_DECIMAL_SCALE,
  REVIEW_BULK_MAX,
} from '../../constants/reviews';
import type { ReviewStatus, ReviewTarget } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { ReviewRaw } from '../../models/review.model';
import type {
  CustomersRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { ReviewsRepository } from '../../repositories/reviews.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { BaseError, BusinessRuleError, NotFoundError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';

export interface AdminReviewRow {
  readonly id: string;
  readonly target: ReviewTarget;
  readonly status: ReviewStatus;
  readonly rating: number;
  readonly comment: string | null;
  readonly salon: { id: string; name: string };
  readonly staff: { id: string; firstName: string } | null;
  readonly author: { id: string; firstName: string; lastName: string };
  /** The author's other reviews, so moderators spot spam. */
  readonly authorOtherReviews: number;
  readonly createdAt: Date;
  readonly moderation: { by: string; at: Date; reason: string | null } | null;
}

export type ReviewDecision = 'approve' | 'reject';

export interface BulkResult {
  readonly id: string;
  readonly ok: boolean;
  readonly code?: string;
}

export interface AdminReviewsService {
  list(input: {
    status?: ReviewStatus | undefined;
    target?: ReviewTarget | undefined;
    salonId?: string | undefined;
    staffId?: string | undefined;
    rating?: number | undefined;
    params: PaginationParams;
  }): Promise<{ items: AdminReviewRow[]; total: number }>;
  decide(input: {
    id: string;
    decision: ReviewDecision;
    reason?: string | undefined;
    actor: AdminActor;
  }): Promise<AdminReviewRow>;
  /** Takes a published review down (APPROVED -> REMOVED); the reason is mandatory. */
  remove(input: { id: string; reason: string; actor: AdminActor }): Promise<AdminReviewRow>;
  bulk(input: {
    ids: readonly string[];
    decision: ReviewDecision;
    reason?: string | undefined;
    actor: AdminActor;
  }): Promise<BulkResult[]>;
}

export interface AdminReviewsDeps {
  readonly reviews: ReviewsRepository;
  readonly salons: Pick<SalonsRepository, 'findMany' | 'findById' | 'patch'>;
  readonly members: Pick<MembersRepository, 'findMany' | 'patch'>;
  readonly customers: Pick<CustomersRepository, 'findMany'>;
  readonly audit: AuditWriter;
  readonly logger: Logger;
  readonly now?: () => Date;
}

const oneDecimal = (value: number): number =>
  Math.round(value * RATING_DECIMAL_SCALE) / RATING_DECIMAL_SCALE;

export const createAdminReviewsService = (deps: AdminReviewsDeps): AdminReviewsService => {
  const { reviews, salons, members, customers, audit, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const rows = async (items: readonly Entity<ReviewRaw>[]): Promise<AdminReviewRow[]> => {
    if (items.length === 0) return [];
    const unique = (ids: string[]): string[] => [...new Set(ids)];
    const customerIds = unique(items.map((r) => r.customerId));
    const [salonRows, staffRows, authors, others] = await Promise.all([
      salons.findMany({ _id: { $in: unique(items.map((r) => r.salonId)) } }),
      members.findMany({
        _id: { $in: unique(items.flatMap((r) => (r.staffId === undefined ? [] : [r.staffId]))) },
      }),
      customers.findMany({ _id: { $in: customerIds } }),
      Promise.all(customerIds.map((customerId) => reviews.count({ customerId }))),
    ]);
    const salonById = new Map(salonRows.map((s) => [s.id, s]));
    const staffById = new Map(staffRows.map((m) => [m.id, m]));
    const authorById = new Map(authors.map((c) => [c.id, c]));
    const total = new Map(customerIds.map((id, i) => [id, others[i] ?? 0]));
    return items.map((r) => {
      const author = authorById.get(r.customerId);
      const staff = r.staffId === undefined ? undefined : staffById.get(r.staffId);
      return {
        id: r.id,
        target: r.target,
        status: r.status,
        rating: r.rating,
        comment: r.comment ?? null,
        salon: { id: r.salonId, name: salonById.get(r.salonId)?.name ?? '' },
        staff: staff === undefined ? null : { id: staff.id, firstName: staff.firstName },
        author: {
          id: r.customerId,
          firstName: author?.firstName ?? '',
          lastName: author?.lastName ?? '',
        },
        authorOtherReviews: Math.max(0, (total.get(r.customerId) ?? 1) - 1),
        createdAt: r.createdAt,
        moderation:
          r.moderation === undefined
            ? null
            : { by: r.moderation.by, at: r.moderation.at, reason: r.moderation.reason ?? null },
      };
    });
  };

  /** Rating = average of the APPROVED reviews of that target (1 decimal) + their count. */
  const recompute = async (review: Entity<ReviewRaw>): Promise<void> => {
    const filter =
      review.staffId === undefined
        ? { salonId: review.salonId, target: 'SALON' }
        : { salonId: review.salonId, target: 'STAFF', staffId: review.staffId };
    const { sum, count } = await reviews.approvedTotals(filter);
    const rating = { avg: count === 0 ? 0 : oneDecimal(sum / count), count };
    if (review.staffId === undefined) {
      await salons.patch(review.salonId, { set: { rating } });
    } else {
      await members.patch(review.staffId, { set: { 'staff.rating': rating } });
    }
  };

  const move = async (
    id: string,
    from: ReviewStatus,
    to: ReviewStatus,
    action: string,
    reason: string,
    actor: AdminActor,
  ): Promise<AdminReviewRow> => {
    const updated = await reviews.transition(id, from, {
      status: to,
      moderation: { by: toObjectId(actor.adminId), at: now(), reason },
    });
    if (updated === null) {
      const exists = await reviews.exists({ _id: id });
      throw exists
        ? new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED })
        : new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    }
    // Public ratings follow the published set: only moves into or out of APPROVED change them.
    if (from === 'APPROVED' || to === 'APPROVED') await recompute(updated);
    await audit.record({
      adminId: actor.adminId,
      action,
      entityType: 'review',
      entityId: id,
      before: { status: from },
      after: { status: to },
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    const [row] = await rows([updated]);
    if (row === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return row;
  };

  const decide: AdminReviewsService['decide'] = ({ id, decision, reason, actor }) =>
    decision === 'approve'
      ? move(
          id,
          'PENDING',
          'APPROVED',
          'REVIEW_APPROVE',
          reason ?? REVIEW_DEFAULT_REASONS.approve,
          actor,
        )
      : move(
          id,
          'PENDING',
          'REJECTED',
          'REVIEW_REJECT',
          reason ?? REVIEW_DEFAULT_REASONS.reject,
          actor,
        );

  return {
    async list({ status = 'PENDING', target, salonId, staffId, rating, params }) {
      const page = await reviews.findPage(
        {
          status,
          ...(target === undefined ? {} : { target }),
          ...(salonId === undefined ? {} : { salonId }),
          ...(staffId === undefined ? {} : { staffId }),
          ...(rating === undefined ? {} : { rating }),
        },
        params,
        // The queue is worked oldest first; published and closed lists show the newest first.
        { createdAt: status === 'PENDING' ? 1 : -1 },
      );
      return { items: await rows(page.items), total: page.meta.total };
    },

    decide,

    remove: ({ id, reason, actor }) =>
      move(id, 'APPROVED', 'REMOVED', 'REVIEW_REMOVE', reason, actor),

    async bulk({ ids, decision, reason, actor }) {
      const unique = [...new Set(ids)].slice(0, REVIEW_BULK_MAX);
      const results: BulkResult[] = [];
      // One by one so each decision gets its own audit entry and rating recompute.
      for (const id of unique) {
        try {
          await decide({ id, decision, reason, actor });
          results.push({ id, ok: true });
        } catch (error) {
          if (!(error instanceof BaseError) || !error.isOperational) throw error;
          logger.info({ reviewId: id, code: error.code }, 'bulk review decision skipped');
          results.push({ id, ok: false, code: error.code });
        }
      }
      return results;
    },
  };
};
