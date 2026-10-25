import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';
import { MOCK_BRANCH_IDS, bookingBranchRef } from './branchesFixture';

interface Seed {
  n: number;
  status: string;
  payment: string;
  bride: boolean;
  total: string;
}
const DAY_MS = 86_400_000;
/** Appointments are n days from now, so "not started yet" rules stay true whenever the tests run. */
const inDays = (n: number, hour: number) =>
  new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS + n * DAY_MS + hour * 3_600_000).toISOString();
const make = ({ n, status, payment, bride, total }: Seed) => ({
  id: `64h${String(n).padStart(21, '0')}`,
  referenceNumber: `WAB-00000${String(n)}`,
  status,
  paymentMethod: payment === 'PAY_ON_ARRIVAL' ? 'PAY_ON_ARRIVAL' : 'DEPOSIT',
  paymentStatus: payment,
  hasBride: bride,
  appointmentStart: inDays(n, 9),
  appointmentEnd: inDays(n, 10),
  respondBy: inDays(n, 8),
  personsCount: n,
  total,
  salon: { id: '64f000000000000000000001', name: 'Noor Salon' },
  branch: bookingBranchRef(n === 2 ? MOCK_BRANCH_IDS.noorSecond : MOCK_BRANCH_IDS.noorMain),
  customer: { id: '64g000000000000000000001', name: 'Dana Khoury', phone: '+962790000301' },
  staff: [{ id: '64f0000000000000000000a2', name: 'Sara Ali' }],
});

export const MOCK_BOOKINGS = [
  make({ n: 1, status: 'PENDING', payment: 'PAY_ON_ARRIVAL', bride: false, total: '25.000' }),
  make({ n: 2, status: 'APPROVED', payment: 'DEPOSIT_PAID', bride: true, total: '120.500' }),
  make({ n: 3, status: 'COMPLETED', payment: 'FULLY_PAID', bride: false, total: '40.000' }),
];

export function bookingsRoutes(): readonly MockRoute[] {
  const rows = MOCK_BOOKINGS.map((b) => ({ ...b }));
  const find = (id: string | undefined) => rows.find((r) => r.id === id) ?? rows[0];
  const O = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(O.getBookings, {
        data: dto.getBookingsDataSchema,
        query: dto.getBookingsQuerySchema,
      }),
      ({ query }) => {
        const statuses = query.getAll('status');
        const q = (query.get('q') ?? '').toLowerCase();
        const items = rows.filter(
          (r) =>
            (statuses.length === 0 || statuses.includes(r.status)) &&
            (!query.get('tab') || query.get('tab') !== 'PENDING' || r.status === 'PENDING') &&
            (query.get('brideOnly') !== 'true' || r.hasBride) &&
            (!query.get('paymentStatus') || r.paymentStatus === query.get('paymentStatus')) &&
            `${r.referenceNumber} ${r.customer.name} ${r.salon.name}`.toLowerCase().includes(q),
        );
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.getBookingsById, { data: dto.getBookingsByIdDataSchema }),
      ({ params }) => {
        const r = find(params['id']);
        if (!r) throw new Error('no booking');
        return {
          data: {
            ...r,
            refundStatus: 'NONE',
            persons: [
              {
                name: 'Dana',
                isBride: r.hasBride,
                start: r.appointmentStart,
                end: r.appointmentEnd,
                subtotal: r.total,
                staff: { id: '64f0000000000000000000a2', name: 'Sara Ali' },
                services: [{ name: 'Haircut', price: r.total, durationMinutes: 60 }],
              },
            ],
            money: {
              total: r.total,
              dueOnline: r.paymentStatus === 'DEPOSIT_PAID' ? '20.000' : '0.000',
              paidOnline: r.paymentStatus === 'DEPOSIT_PAID' ? '20.000' : '0.000',
              remaining: r.total,
              refunded: '0.000',
            },
            policy: {},
            statusHistory: [
              {
                status: 'PENDING',
                actorType: 'CUSTOMER',
                reason: null,
                at: '2026-10-10T08:00:00.000Z',
              },
            ],
            rejection: null,
            cancellation: null,
            createdAt: '2026-10-10T08:00:00.000Z',
            actions: ['APPROVE' as const, 'REJECT' as const],
          },
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postBookingsByIdStatus, {
        data: dto.postBookingsByIdStatusDataSchema,
        body: dto.postBookingsByIdStatusBodySchema,
      }),
      ({ params, body }) => {
        const r = find(params['id']);
        if (!r) throw new Error('no booking');
        const status = (body as { status: string }).status;
        const irregular = r.status === 'COMPLETED' || r.status.startsWith('CANCELLED');
        r.status = status;
        return { data: { id: r.id, referenceNumber: r.referenceNumber, status, irregular } };
      },
    ),
    mockRoute(
      defineEndpoint(O.getBookingsByIdEligibleStaff, {
        data: dto.getBookingsByIdEligibleStaffDataSchema,
        query: dto.getBookingsByIdEligibleStaffQuerySchema,
      }),
      () => ({
        data: [
          { staffId: '64f0000000000000000000a2', name: 'Sara Ali' },
          { staffId: '64f0000000000000000000a3', name: 'Lina Omar' },
        ],
      }),
    ),
    mockRoute(
      defineEndpoint(O.postBookingsByIdReassign, {
        data: dto.postBookingsByIdReassignDataSchema,
        body: dto.postBookingsByIdReassignBodySchema,
      }),
      ({ params }) => {
        const r = find(params['id']);
        if (!r) throw new Error('no booking');
        return {
          data: {
            id: r.id,
            referenceNumber: r.referenceNumber,
            status: r.status,
            appointmentStart: r.appointmentStart,
            appointmentEnd: r.appointmentEnd,
            money: { total: r.total, dueOnline: '0.000', paidOnline: '0.000', remaining: r.total },
          },
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postBookingsByIdCancel, {
        data: dto.postBookingsByIdCancelDataSchema,
        body: dto.postBookingsByIdCancelBodySchema,
      }),
      ({ params, body }) => {
        const r = find(params['id']);
        if (!r) throw new Error('no booking');
        const mode = (body as { mode: string }).mode;
        r.status = mode === 'CUSTOMER' ? 'CANCELLED_BY_CUSTOMER' : 'CANCELLED_BY_SALON';
        return {
          data: {
            id: r.id,
            referenceNumber: r.referenceNumber,
            status: r.status,
            appointmentStart: r.appointmentStart,
            appointmentEnd: r.appointmentEnd,
            money: { total: r.total, dueOnline: '0.000', paidOnline: '0.000', remaining: r.total },
            irregular: false,
          },
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postBookingsByIdRefund, {
        data: dto.postBookingsByIdRefundDataSchema,
        body: dto.postBookingsByIdRefundBodySchema,
      }),
      ({ params, body }) => {
        const r = find(params['id']);
        if (!r) throw new Error('no booking');
        return {
          data: { id: r.id, amount: (body as { amount: string }).amount, status: 'PENDING' },
        };
      },
    ),
  ];
}
