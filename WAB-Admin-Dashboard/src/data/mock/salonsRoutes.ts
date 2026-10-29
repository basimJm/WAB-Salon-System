import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import { MockBusinessError, type MockRoute } from './mockTransport';
import { createBranchStore, type BranchStore } from './branchStore';
import { MOCK_BOOKINGS } from './bookingsRoutes';

const OPEN_BOOKINGS = new Set(['PENDING', 'APPROVED']);
/** Future bookings that block narrowing a salon's audience (§5.19 → §5.12), as the server lists them. */
const openBookingIds = (salonId: string) =>
  MOCK_BOOKINGS.filter((b) => b.salon.id === salonId && OPEN_BOOKINGS.has(b.status)).map(
    (b) => b.id,
  );

const AMMAN = '64a000000000000000000001';
const IRBID = '64a000000000000000000002';
interface Seed {
  n: number;
  name: string;
  businessType: 'SALON' | 'CLINIC';
  audience: 'FEMALE' | 'MALE' | 'BOTH';
  state: 'LIVE' | 'OFFLINE' | 'APPROVED_INCOMPLETE';
  cityId: string;
  sub: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | null;
}
const salon = ({ n, name, businessType, audience, state, cityId, sub }: Seed) => ({
  id: `64f${String(n).padStart(21, '0')}`,
  name,
  businessType,
  audience,
  state,
  cityId,
  areaId: null,
  rating: { avg: 4.5, count: n * 3 },
  subscriptionStatus: sub,
  recommended: n === 1,
  bookings30d: n * 10,
  deletionRequestedAt: (n === 3 ? '2026-10-15T08:00:00.000Z' : null) as string | null,
  createdAt: `2026-09-${String(10 + n).padStart(2, '0')}T08:00:00.000Z`,
});

export const MOCK_SALONS = [
  salon({
    n: 1,
    name: 'Noor Salon',
    businessType: 'SALON',
    audience: 'FEMALE',
    state: 'LIVE',
    cityId: AMMAN,
    sub: 'ACTIVE',
  }),
  salon({
    n: 2,
    name: 'Royal Barber',
    businessType: 'SALON',
    audience: 'MALE',
    state: 'OFFLINE',
    cityId: AMMAN,
    sub: 'TRIAL',
  }),
  salon({
    n: 3,
    name: 'Lama Beauty',
    businessType: 'SALON',
    audience: 'BOTH',
    state: 'APPROVED_INCOMPLETE',
    cityId: IRBID,
    sub: 'TRIAL',
  }),
  salon({
    n: 4,
    name: 'Glow Clinic',
    businessType: 'CLINIC',
    audience: 'BOTH',
    state: 'LIVE',
    cityId: AMMAN,
    sub: 'ACTIVE',
  }),
];

const details = (s: (typeof MOCK_SALONS)[number], store: BranchStore) => ({
  ...s,
  deletionApprovedAt: null as string | null,
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
  branches: store.list(s.id),
});

type Mock = (typeof MOCK_SALONS)[number];

export function salonsRoutes(store: BranchStore = createBranchStore()): readonly MockRoute[] {
  const changes = new Map<string, Partial<Mock>>();
  let payout: { bankName: string; accountHolderName: string; iban: string } | null = null;
  const find = (id: string | undefined): Mock => {
    const base = MOCK_SALONS.find((s) => s.id === id) ?? MOCK_SALONS[0];
    if (!base) throw new Error('no mock salons');
    return { ...base, ...changes.get(base.id) };
  };
  const setState = (id: string | undefined, state: Mock['state']) => {
    const salon = find(id);
    changes.set(salon.id, { ...changes.get(salon.id), state });
    return { data: { salonId: salon.id, state, missing: [], isComplete: true } };
  };
  const O = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(O.postSalonsByIdOffline, {
        data: dto.postSalonsByIdOfflineDataSchema,
        body: dto.postSalonsByIdOfflineBodySchema,
      }),
      ({ params }) => setState(params['id'], 'OFFLINE'),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdOnline, {
        data: dto.postSalonsByIdOnlineDataSchema,
        body: dto.postSalonsByIdOnlineBodySchema,
      }),
      ({ params }) => setState(params['id'], 'LIVE'),
    ),
    mockRoute(
      defineEndpoint(O.patchSalonsByIdAudience, {
        data: dto.patchSalonsByIdAudienceDataSchema,
        body: dto.patchSalonsByIdAudienceBodySchema,
      }),
      ({ params, body }) => {
        const salon = find(params['id']);
        const { audience } = body as { audience: Mock['audience'] };
        // Like the server (§5.19): a clinic is always BOTH, the same audience is not a change.
        if (salon.businessType === 'CLINIC') {
          throw new MockBusinessError(422, 'AUDIENCE_CHANGE_NOT_ALLOWED');
        }
        if (salon.audience === audience) throw new MockBusinessError(422, 'INVALID_TRANSITION');
        const blocking = audience === 'BOTH' ? [] : openBookingIds(salon.id);
        if (blocking.length > 0) throw new MockBusinessError(409, 'SCHEDULE_CONFLICT', blocking);
        changes.set(salon.id, { ...changes.get(salon.id), audience });
        return { data: details(find(params['id']), store) };
      },
    ),
    mockRoute(
      defineEndpoint(O.getSalonsByIdPayoutDetails, {
        data: dto.getSalonsByIdPayoutDetailsDataSchema,
      }),
      () => ({
        data: payout ? { ...payout, ibanLast4: payout.iban.slice(-4) } : null,
      }),
    ),
    mockRoute(
      defineEndpoint(O.putSalonsByIdPayoutDetails, {
        data: dto.putSalonsByIdPayoutDetailsDataSchema,
        body: dto.putSalonsByIdPayoutDetailsBodySchema,
      }),
      ({ body }) => {
        const b = body as { bankName: string; accountHolderName: string; iban: string };
        payout = { bankName: b.bankName, accountHolderName: b.accountHolderName, iban: b.iban };
        return {
          data: {
            bankName: b.bankName,
            accountHolderName: b.accountHolderName,
            ibanLast4: b.iban.slice(-4),
          },
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.getSalonsById, { data: dto.getSalonsByIdDataSchema }),
      ({ params }) => ({
        data: details(find(params['id']), store),
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
            (!query.get('businessType') || s.businessType === query.get('businessType')) &&
            (!query.get('audience') || s.audience === query.get('audience')) &&
            (!query.get('cityId') || s.cityId === query.get('cityId')) &&
            (!query.get('subscription') || s.subscriptionStatus === query.get('subscription')) &&
            (!query.get('recommended') || String(s.recommended) === query.get('recommended')) &&
            (!query.get('deletionRequested') || s.deletionRequestedAt !== null) &&
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
