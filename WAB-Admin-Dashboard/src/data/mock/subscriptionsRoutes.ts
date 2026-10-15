import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

type Status = 'TRIAL' | 'ACTIVE' | 'EXPIRED';
interface Payment {
  amount: string;
  paidAt: string;
  periodFrom: string;
  periodTo: string;
  method: string;
  reference: string;
  note: string | null;
  recordedBy: string;
}
const sub = (n: number, name: string, status: Status, days: number) => ({
  salonId: `64f00000000000000000000${String(n)}`,
  salonName: name,
  status,
  trialEndsAt: '2026-09-01T00:00:00.000Z',
  currentPeriodEnd: status === 'ACTIVE' ? '2026-11-01T00:00:00.000Z' : null,
  endsAt: status === 'ACTIVE' ? '2026-11-01T00:00:00.000Z' : '2026-09-01T00:00:00.000Z',
  daysRemaining: days,
  lastPayment: null as Payment | null,
  payments: [] as Payment[],
});
export const MOCK_SUBSCRIPTIONS = [
  sub(1, 'Noor Salon', 'ACTIVE', 18),
  sub(2, 'Royal Barber', 'TRIAL', 5),
  sub(3, 'Lama Beauty', 'EXPIRED', -3),
];

export function subscriptionsRoutes(): readonly MockRoute[] {
  const rows = MOCK_SUBSCRIPTIONS.map((s) => ({ ...s, payments: [...s.payments] }));
  const O = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(O.getSubscriptions, {
        data: dto.getSubscriptionsDataSchema,
        query: dto.getSubscriptionsQuerySchema,
      }),
      ({ query }) => {
        const ending = query.get('endingInDays');
        const items = rows.filter(
          (r) =>
            (!query.get('status') || r.status === query.get('status')) &&
            (!ending || (r.daysRemaining >= 0 && r.daysRemaining <= Number(ending))),
        );
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postSubscriptionsBySalonIdPayments, {
        data: dto.postSubscriptionsBySalonIdPaymentsDataSchema,
        body: dto.postSubscriptionsBySalonIdPaymentsBodySchema,
      }),
      ({ params, body }) => {
        const row = rows.find((r) => r.salonId === params['salonId']);
        if (!row) throw new Error('no subscription');
        const b = body as Omit<Payment, 'recordedBy' | 'note'> & { note?: string };
        const payment: Payment = { ...b, note: b.note ?? null, recordedBy: 'admin' };
        Object.assign(row, {
          status: 'ACTIVE',
          currentPeriodEnd: b.periodTo,
          endsAt: b.periodTo,
          daysRemaining: 30,
          lastPayment: payment,
          payments: [payment, ...row.payments],
        });
        return { data: { ...row } };
      },
    ),
  ];
}
