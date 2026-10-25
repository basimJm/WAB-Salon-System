import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';
import { MOCK_BRANCH_IDS, reviewBranchRef } from './branchesFixture';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
const review = (n: number, status: Status, rating: number, comment: string | null) => ({
  id: `64d${String(n).padStart(21, '0')}`,
  target: n === 3 ? 'STAFF' : 'SALON',
  status,
  rating,
  comment,
  salon: { id: '64f000000000000000000001', name: 'Noor Salon' },
  staff: n === 3 ? { id: '64f0000000000000000000a2', firstName: 'Sara' } : null,
  branch: reviewBranchRef(n === 2 ? MOCK_BRANCH_IDS.noorSecond : MOCK_BRANCH_IDS.noorMain),
  author: { id: '64g000000000000000000001', firstName: 'Dana', lastName: 'Khoury' },
  authorOtherReviews: n,
  createdAt: `2026-10-0${String(n)}T08:00:00.000Z`,
  moderation: null as { by: string; at: string; reason: string | null } | null,
});
export const MOCK_REVIEWS = [
  review(1, 'PENDING', 5, 'Wonderful service'),
  review(2, 'PENDING', 1, null),
  review(3, 'PENDING', 4, 'Sara was great'),
  review(4, 'APPROVED', 5, 'Loved it'),
];

export function reviewsRoutes(): readonly MockRoute[] {
  const rows = MOCK_REVIEWS.map((r) => ({ ...r }));
  const O = OPERATIONS;
  const decide = (id: string | undefined, status: Status, reason: string | null) => {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error('no review');
    row.status = status;
    row.moderation = { by: 'admin', at: '2026-10-14T08:00:00.000Z', reason };
    return { data: { ...row } };
  };
  const reasonOf = (body: unknown) => (body as { reason?: string }).reason ?? null;
  return [
    mockRoute(
      defineEndpoint(O.getReviews, {
        data: dto.getReviewsDataSchema,
        query: dto.getReviewsQuerySchema,
      }),
      ({ query }) => {
        const items = rows.filter(
          (r) =>
            (!query.get('status') || r.status === query.get('status')) &&
            (!query.get('target') || r.target === query.get('target')) &&
            (!query.get('rating') || r.rating === Number(query.get('rating'))) &&
            (!query.get('branchId') || r.branch?.id === query.get('branchId')),
        );
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postReviewsByIdApprove, {
        data: dto.postReviewsByIdApproveDataSchema,
        body: dto.postReviewsByIdApproveBodySchema,
      }),
      ({ params, body }) => decide(params['id'], 'APPROVED', reasonOf(body)),
    ),
    mockRoute(
      defineEndpoint(O.postReviewsByIdReject, {
        data: dto.postReviewsByIdRejectDataSchema,
        body: dto.postReviewsByIdRejectBodySchema,
      }),
      ({ params, body }) => decide(params['id'], 'REJECTED', reasonOf(body)),
    ),
    mockRoute(
      defineEndpoint(O.postReviewsByIdRemove, {
        data: dto.postReviewsByIdRemoveDataSchema,
        body: dto.postReviewsByIdRemoveBodySchema,
      }),
      ({ params, body }) => decide(params['id'], 'REMOVED', reasonOf(body)),
    ),
    mockRoute(
      defineEndpoint(O.postReviewsBulk, {
        data: dto.postReviewsBulkDataSchema,
        body: dto.postReviewsBulkBodySchema,
      }),
      ({ body }) => {
        const b = body as { ids: string[]; decision: 'approve' | 'reject' };
        return {
          data: b.ids.map((id) => {
            const row = rows.find((r) => r.id === id);
            // Reviews no longer pending cannot be decided again: report it per item.
            if (!row || row.status !== 'PENDING') return { id, ok: false, code: 'ALREADY_HANDLED' };
            row.status = b.decision === 'approve' ? 'APPROVED' : 'REJECTED';
            return { id, ok: true };
          }),
        };
      },
    ),
  ];
}
