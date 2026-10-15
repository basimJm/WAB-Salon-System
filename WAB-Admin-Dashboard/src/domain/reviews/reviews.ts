import type { Page, PageQuery } from '@/domain/shared/page';

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'] as const;
export const REVIEW_TARGETS = ['SALON', 'STAFF'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type ReviewTarget = (typeof REVIEW_TARGETS)[number];

export interface Review {
  readonly id: string;
  readonly target: ReviewTarget;
  readonly status: ReviewStatus;
  readonly rating: number;
  readonly comment: string | null;
  readonly salon: { readonly id: string; readonly name: string };
  readonly staff: { readonly id: string; readonly firstName: string } | null;
  readonly author: { readonly id: string; readonly firstName: string; readonly lastName: string };
  /** How many other reviews this customer wrote (a hint for spotting abuse). */
  readonly authorOtherReviews: number;
  readonly createdAt: string;
  readonly moderation: {
    readonly by: string;
    readonly at: string;
    readonly reason: string | null;
  } | null;
}

export interface ReviewQuery extends PageQuery {
  status?: ReviewStatus;
  target?: ReviewTarget;
  salonId?: string;
  staffId?: string;
  rating?: number;
}
export interface BulkResult {
  readonly id: string;
  readonly ok: boolean;
  readonly code?: string | undefined;
}
export const MAX_BULK = 100;

export interface ReviewsRepository {
  list(query: ReviewQuery): Promise<Page<Review>>;
  approve(id: string, reason?: string): Promise<Review>;
  reject(id: string, reason?: string): Promise<Review>;
  /** A published review is hidden for good; the average rating is recomputed. */
  remove(id: string, reason: string): Promise<Review>;
  bulk(
    ids: readonly string[],
    decision: 'approve' | 'reject',
    reason?: string,
  ): Promise<readonly BulkResult[]>;
}
