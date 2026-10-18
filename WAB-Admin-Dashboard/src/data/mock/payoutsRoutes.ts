import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const SALON = '64f000000000000000000001';
const balance = (n: number, name: string, dueNow: string) => ({
  salonId: `64f00000000000000000000${String(n)}`,
  name,
  balance: dueNow,
  charges: '500.000',
  gatewayFees: '-7.500',
  refunds: '-20.000',
  payouts: '-100.000',
  adjustments: '0.000',
  dueNow,
  lastPayout:
    n === 1
      ? {
          periodTo: '2026-09-30T21:00:00.000Z',
          net: '100.000',
          status: 'TRANSFERRED' as 'PENDING' | 'TRANSFERRED',
        }
      : null,
});
export const MOCK_BALANCES = [
  balance(1, 'Noor Salon', '372.500'),
  balance(2, 'Royal Barber', '0.000'),
];

const payout = (id: string, status: 'PENDING' | 'TRANSFERRED') => ({
  id,
  salonId: SALON,
  periodFrom: '2026-09-30T21:00:00.000Z',
  periodTo: '2026-10-10T21:00:00.000Z',
  gross: '400.000',
  fees: '-6.000',
  refunds: '-10.000',
  adjustments: '0.000',
  net: '384.000',
  status,
  transferredAt: status === 'TRANSFERRED' ? '2026-10-12T08:00:00.000Z' : null,
  transferReference: status === 'TRANSFERRED' ? 'TRX-1' : null,
  note: null as string | null,
  createdBy: 'admin',
  createdAt: '2026-10-11T08:00:00.000Z',
});

export function payoutsRoutes(): readonly MockRoute[] {
  const rows = [
    payout('64d7000000000000000000a1', 'PENDING'),
    payout('64d7000000000000000000a2', 'TRANSFERRED'),
  ];
  const O = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(O.getPayoutsBalances, {
        data: dto.getPayoutsBalancesDataSchema,
        query: dto.getPayoutsBalancesQuerySchema,
      }),
      () => ({
        data: MOCK_BALANCES,
        meta: { page: 1, pageSize: 25, total: MOCK_BALANCES.length, totalPages: 1 },
        empty: [],
      }),
    ),
    mockRoute(
      defineEndpoint(O.getPayoutsPreview, {
        data: dto.getPayoutsPreviewDataSchema,
        query: dto.getPayoutsPreviewQuerySchema,
      }),
      ({ query }) => ({
        data: {
          salonId: query.get('salonId') ?? SALON,
          periodFrom: '2026-09-30T21:00:00.000Z',
          periodTo: query.get('periodTo') ?? '',
          gross: '300.000',
          fees: '-4.500',
          refunds: '0.000',
          adjustments: '0.000',
          net: '295.500',
        },
      }),
    ),
    mockRoute(
      defineEndpoint(O.getPayouts, {
        data: dto.getPayoutsDataSchema,
        query: dto.getPayoutsQuerySchema,
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
      defineEndpoint(O.postPayouts, {
        data: dto.postPayoutsDataSchema,
        body: dto.postPayoutsBodySchema,
      }),
      ({ body }) => {
        const b = body as { salonId: string; periodTo: string };
        const row = {
          ...payout(`64d7000000000000000000b${String(rows.length)}`, 'PENDING'),
          salonId: b.salonId,
          periodTo: b.periodTo,
          net: '295.500',
        };
        rows.unshift(row);
        return { data: row, status: 201 };
      },
    ),
    mockRoute(
      defineEndpoint(O.postPayoutsByIdTransfer, {
        data: dto.postPayoutsByIdTransferDataSchema,
        body: dto.postPayoutsByIdTransferBodySchema,
      }),
      ({ params, body }) => {
        const row = rows.find((r) => r.id === params['id']);
        if (!row) throw new Error('no payout');
        const b = body as { transferredAt: string; transferReference: string; note: string };
        Object.assign(row, {
          status: 'TRANSFERRED',
          transferredAt: b.transferredAt,
          transferReference: b.transferReference,
          note: b.note,
        });
        return { data: { ...row } };
      },
    ),
  ];
}
