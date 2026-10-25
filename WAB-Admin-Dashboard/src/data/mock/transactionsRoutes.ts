import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { salonBranchQuerySchema } from '../api/objectId';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';
import { MOCK_BRANCH_IDS } from './branchesFixture';

const tx = (
  n: number,
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED',
  type: 'DEPOSIT' | 'FULL',
  amount: string,
) => ({
  id: `64d9${String(n).padStart(20, '0')}`,
  bookingDraftId: '64d9000000000000000000f1',
  bookingId: status === 'SUCCEEDED' ? '64a000000000000000000e01' : null,
  customerId: '64a000000000000000000c01',
  salonId: '64a000000000000000000501',
  branchId: n === 3 ? MOCK_BRANCH_IDS.noorSecond : (MOCK_BRANCH_IDS.noorMain as string | null),
  type,
  amount,
  currency: 'JOD',
  attempt: n === 2 ? 2 : 1,
  provider: 'hyperpay',
  providerRef: `ref-${String(n)}`,
  status,
  gatewayCode: status === 'FAILED' ? '800.100.151' : '000.100.110',
  gatewayMessage: status === 'FAILED' ? 'Card declined' : 'Request successfully processed',
  gatewayFee: status === 'SUCCEEDED' ? '0.450' : null,
  refundedAt: null,
  chargedAt: status === 'SUCCEEDED' ? '2026-10-10T08:01:00.000Z' : null,
  platform: 'ANDROID',
  appVersion: '1.4.0',
  createdAt: `2026-10-10T08:0${String(n)}:00.000Z`,
});
export const MOCK_TRANSACTIONS = [
  tx(1, 'FAILED', 'DEPOSIT', '12.000'),
  tx(2, 'SUCCEEDED', 'DEPOSIT', '12.000'),
  tx(3, 'PENDING', 'FULL', '60.000'),
];

export function transactionsRoutes(): readonly MockRoute[] {
  const O = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(O.getFinanceReconciliation, {
        data: dto.getFinanceReconciliationDataSchema,
        query: salonBranchQuerySchema,
      }),
      () => ({
        data: {
          stuckPending: [MOCK_TRANSACTIONS[2]!],
          paidWithoutBooking: [],
          missingLedger: [MOCK_TRANSACTIONS[1]!],
        },
      }),
    ),
    mockRoute(
      defineEndpoint(O.getTransactions, {
        data: dto.getTransactionsDataSchema,
        query: dto.getTransactionsQuerySchema,
      }),
      ({ query }) => {
        const items = MOCK_TRANSACTIONS.filter(
          (t) =>
            (!query.get('status') || t.status === query.get('status')) &&
            (!query.get('type') || t.type === query.get('type')),
        );
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.getTransactionsById, { data: dto.getTransactionsByIdDataSchema }),
      ({ params }) => {
        const t = MOCK_TRANSACTIONS.find((x) => x.id === params['id']) ?? MOCK_TRANSACTIONS[0];
        if (!t) throw new Error('no transaction');
        return {
          data: {
            ...t,
            raw: { result: { code: t.gatewayCode }, id: t.providerRef },
            attempts: MOCK_TRANSACTIONS.slice(0, 2),
          },
        };
      },
    ),
  ];
}
