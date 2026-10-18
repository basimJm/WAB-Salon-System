import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

type Status = 'ACTIVE' | 'BLOCKED' | 'DELETION_PENDING' | 'DELETED';
const AMMAN = '64a000000000000000000001';
const customer = (n: number, name: string, status: Status) => ({
  id: `64g${String(n).padStart(21, '0')}`,
  name,
  phone: `+96279000030${String(n)}`,
  gender: 'FEMALE' as 'FEMALE' | 'MALE',
  cityId: AMMAN,
  status,
  registeredAt: '2026-08-01T08:00:00.000Z',
  lastActiveAt: n === 2 ? null : '2026-10-12T08:00:00.000Z',
  bookingsCount: n * 2,
});
export const MOCK_CUSTOMERS = [
  customer(1, 'Dana Khoury', 'ACTIVE'),
  customer(2, 'Omar Saleh', 'BLOCKED'),
  customer(3, 'Rima Haddad', 'ACTIVE'),
];

export function customersRoutes(): readonly MockRoute[] {
  const rows = MOCK_CUSTOMERS.map((c) => ({ ...c }));
  const O = OPERATIONS;
  const find = (id: string | undefined) => rows.find((r) => r.id === id) ?? rows[0];
  const set = (id: string | undefined, status: Status) => {
    const row = find(id);
    if (row) row.status = status;
    return { data: null };
  };
  return [
    mockRoute(
      defineEndpoint(O.getCustomers, {
        data: dto.getCustomersDataSchema,
        query: dto.getCustomersQuerySchema,
      }),
      ({ query }) => {
        const q = (query.get('q') ?? '').toLowerCase();
        const items = rows.filter(
          (r) =>
            (!query.get('status') || r.status === query.get('status')) &&
            (!query.get('gender') || r.gender === query.get('gender')) &&
            `${r.name} ${r.phone}`.toLowerCase().includes(q),
        );
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.getCustomersById, { data: dto.getCustomersByIdDataSchema }),
      ({ params }) => {
        const r = find(params['id']);
        if (!r) throw new Error('no customer');
        return {
          data: {
            ...r,
            email: 'customer@example.test', // hardcoded-ok: mock data
            areaId: '',
            language: 'ar',
            pushEnabled: true,
            blockedReason: r.status === 'BLOCKED' ? 'Abuse reports' : null,
            blockedAt: r.status === 'BLOCKED' ? '2026-10-02T08:00:00.000Z' : null,
            deletionScheduledAt:
              r.status === 'DELETION_PENDING' ? '2026-11-01T00:00:00.000Z' : null,
            journeyUserId: `journey-${r.id.slice(-4)}`,
            devices: [
              {
                app: 'CUSTOMER',
                platform: 'ANDROID',
                appVersion: '1.4.0',
                lastSeenAt: '2026-10-12T08:00:00.000Z',
                pushToken: true,
              },
            ],
          },
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postCustomersByIdBlock, {
        data: dto.postCustomersByIdBlockDataSchema,
        body: dto.postCustomersByIdBlockBodySchema,
      }),
      ({ params }) => set(params['id'], 'BLOCKED'),
    ),
    mockRoute(
      defineEndpoint(O.postCustomersByIdUnblock, {
        data: dto.postCustomersByIdUnblockDataSchema,
        body: dto.postCustomersByIdUnblockBodySchema,
      }),
      ({ params }) => set(params['id'], 'ACTIVE'),
    ),
    mockRoute(
      defineEndpoint(O.postCustomersByIdDelete, {
        data: dto.postCustomersByIdDeleteDataSchema,
        body: dto.postCustomersByIdDeleteBodySchema,
      }),
      ({ params }) => set(params['id'], 'DELETION_PENDING'),
    ),
    mockRoute(
      defineEndpoint(O.postCustomersByIdRestore, {
        data: dto.postCustomersByIdRestoreDataSchema,
        body: dto.postCustomersByIdRestoreBodySchema,
      }),
      ({ params }) => set(params['id'], 'ACTIVE'),
    ),
  ];
}
