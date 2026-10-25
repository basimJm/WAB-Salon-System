import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';
import { MOCK_BRANCH_IDS } from './branchesFixture';

type Status = 'REFUND_PENDING' | 'REFUNDED' | 'REFUND_FAILED';
const refund = (n: number, status: Status, nextAttemptAt: string | null) => ({
  id: `64d8${String(n).padStart(20, '0')}`,
  bookingId: '64a000000000000000000e01' as string | null,
  transactionId: '64d9000000000000000000a1',
  salonId: '64a000000000000000000501',
  branchId: n === 2 ? MOCK_BRANCH_IDS.noorSecond : (MOCK_BRANCH_IDS.noorMain as string | null),
  customerId: '64a000000000000000000c01',
  amount: `${String(n * 10)}.000`,
  source: 'SALON_REJECT' as const,
  reason: null as string | null,
  status,
  attempts: n,
  lastError: status === 'REFUND_FAILED' ? 'Gateway timeout' : null,
  nextAttemptAt,
  completedAt: status === 'REFUNDED' ? '2026-10-11T08:00:00.000Z' : null,
  manual: null as { by: string; reference: string } | null,
  createdAt: '2026-10-09T08:00:00.000Z',
});
export const MOCK_REFUNDS = [
  refund(1, 'REFUND_FAILED', '2020-01-01T00:00:00.000Z'),
  refund(2, 'REFUND_PENDING', '2999-01-01T00:00:00.000Z'),
  refund(3, 'REFUNDED', null),
];

export function refundsRoutes(): readonly MockRoute[] {
  const rows = MOCK_REFUNDS.map((r) => ({ ...r }));
  const O = OPERATIONS;
  const find = (id: string | undefined) => {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error('no refund');
    return row;
  };
  return [
    mockRoute(
      defineEndpoint(O.getRefunds, {
        data: dto.getRefundsDataSchema,
        query: dto.getRefundsQuerySchema,
      }),
      ({ query }) => {
        const items = rows.filter((r) => !query.get('status') || r.status === query.get('status'));
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postRefundsByIdRetry, {
        data: dto.postRefundsByIdRetryDataSchema,
        body: dto.postRefundsByIdRetryBodySchema,
      }),
      ({ params }) => {
        const row = find(params['id']);
        Object.assign(row, {
          status: 'REFUNDED',
          completedAt: '2026-10-14T08:00:00.000Z',
          nextAttemptAt: null,
          lastError: null,
        });
        return { data: { ...row } };
      },
    ),
    mockRoute(
      defineEndpoint(O.postRefundsByIdManual, {
        data: dto.postRefundsByIdManualDataSchema,
        body: dto.postRefundsByIdManualBodySchema,
      }),
      ({ params, body }) => {
        const row = find(params['id']);
        Object.assign(row, {
          status: 'REFUNDED',
          nextAttemptAt: null,
          manual: { by: 'admin', reference: (body as { reference: string }).reference },
        });
        return { data: { ...row } };
      },
    ),
  ];
}
