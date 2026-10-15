import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const AMMAN = '64a000000000000000000001';
const IRBID = '64a000000000000000000002';
interface Seed {
  n: number;
  name: string;
  gender: 'FEMALE' | 'MALE';
  state: 'LIVE' | 'OFFLINE' | 'APPROVED_INCOMPLETE';
  cityId: string;
  sub: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | null;
}
const salon = ({ n, name, gender, state, cityId, sub }: Seed) => ({
  id: `64f${String(n).padStart(21, '0')}`,
  name,
  gender,
  state,
  cityId,
  areaId: null,
  rating: { avg: 4.5, count: n * 3 },
  subscriptionStatus: sub,
  createdAt: `2026-09-${String(10 + n).padStart(2, '0')}T08:00:00.000Z`,
});

export const MOCK_SALONS = [
  salon({
    n: 1,
    name: 'Noor Salon',
    gender: 'FEMALE',
    state: 'LIVE',
    cityId: AMMAN,
    sub: 'ACTIVE',
  }),
  salon({
    n: 2,
    name: 'Royal Barber',
    gender: 'MALE',
    state: 'OFFLINE',
    cityId: AMMAN,
    sub: 'TRIAL',
  }),
  salon({
    n: 3,
    name: 'Lama Beauty',
    gender: 'FEMALE',
    state: 'APPROVED_INCOMPLETE',
    cityId: IRBID,
    sub: 'TRIAL',
  }),
];

const details = (s: (typeof MOCK_SALONS)[number]) => ({
  ...s,
  description: 'Hair, nails and bridal packages',
  phone: '+962790000100',
  completeness:
    s.state === 'APPROVED_INCOMPLETE'
      ? { missing: ['GALLERY', 'HOURS'], isComplete: false }
      : { missing: [], isComplete: true },
  offline:
    s.state === 'OFFLINE' ? { reason: 'Owner request', at: '2026-10-01T09:00:00.000Z' } : null,
  owner: {
    id: '64f0000000000000000000a1',
    firstName: 'Maha',
    lastName: 'Haddad',
    phone: '+962790000101',
  },
  subscription: s.subscriptionStatus
    ? {
        status: s.subscriptionStatus,
        trialEndsAt: '2026-12-01T00:00:00.000Z',
        currentPeriodEnd: null,
      }
    : null,
});

export function salonsRoutes(): readonly MockRoute[] {
  return [
    mockRoute(
      defineEndpoint(OPERATIONS.getSalonsById, { data: dto.getSalonsByIdDataSchema }),
      ({ params }) => ({
        data: details(
          MOCK_SALONS.find((s) => s.id === params['id']) ??
            (MOCK_SALONS[0] as (typeof MOCK_SALONS)[number]),
        ),
      }),
    ),
    mockRoute(
      defineEndpoint(OPERATIONS.getSalonsByIdMembers, { data: dto.getSalonsByIdMembersDataSchema }),
      () => ({
        data: [
          {
            id: '64f0000000000000000000a1',
            name: 'Maha Haddad',
            phone: '+962790000101',
            role: 'OWNER',
            active: true,
            providesServices: false,
            permissions: ['BOOKINGS_VIEW_ALL', 'FINANCE_VIEW'],
          },
          {
            id: '64f0000000000000000000a2',
            name: 'Sara Ali',
            phone: '+962790000102',
            role: 'EMPLOYEE',
            active: true,
            providesServices: true,
            permissions: [],
          },
        ],
      }),
    ),
    mockRoute(
      defineEndpoint(OPERATIONS.getSalons, {
        data: dto.getSalonsDataSchema,
        query: dto.getSalonsQuerySchema,
      }),
      ({ query }) => {
        const q = (query.get('q') ?? '').toLowerCase();
        const rows = MOCK_SALONS.filter(
          (s) =>
            (!query.get('state') || s.state === query.get('state')) &&
            (!query.get('gender') || s.gender === query.get('gender')) &&
            (!query.get('cityId') || s.cityId === query.get('cityId')) &&
            s.name.toLowerCase().includes(q),
        );
        return {
          data: rows,
          meta: { page: 1, pageSize: 25, total: rows.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
  ];
}
