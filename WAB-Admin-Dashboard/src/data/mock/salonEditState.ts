import { MOCK_CDN_BASE } from '@/constants/mock';
import { MOCK_SALONS } from './salonsRoutes';

export type Day = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
const DAYS: Day[] = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
const OBJECT_ID_LENGTH = 24;
const CITY = '64a000000000000000000001';

export const uid = (prefix: string, n: number) =>
  `${prefix}${String(n).padStart(OBJECT_ID_LENGTH - prefix.length, '0')}`;
/** Mock catalog service ids the salon menu is built from. */
export const MOCK_CATALOG_SERVICE = '64e000000000000000000009';

function salonState(id: string) {
  const salon = MOCK_SALONS.find((s) => s.id === id) ?? MOCK_SALONS[0];
  return {
    profile: {
      id,
      name: salon?.name ?? 'Salon',
      gender: salon?.gender ?? ('FEMALE' as const),
      state: salon?.state ?? 'LIVE',
      description: 'Hair, nails and bridal packages' as string | null,
      coverUrl: null as string | null,
      profileUrl: null as string | null,
      coverKey: null as string | null,
      profileKey: null as string | null,
      location: { latitude: 31.95, longitude: 35.91 } as {
        latitude: number;
        longitude: number;
      } | null,
      locationText: 'Abdoun, Amman' as string | null,
      cityId: CITY as string | null,
      areaId: null as string | null,
      phone: '+962790000100' as string | null,
      whatsapp: null as string | null,
      completeness: { missing: [] as string[], isComplete: true },
      rating: { avg: 4.5, count: 12 },
    },
    gallery: [
      {
        id: uid('64c', 1),
        type: 'IMAGE' as 'IMAGE' | 'VIDEO',
        url: `${MOCK_CDN_BASE}/g1.jpg`,
        thumbnailUrl: null as string | null,
        durationSec: null as number | null,
        order: 1,
      },
      {
        id: uid('64c', 2),
        type: 'IMAGE' as 'IMAGE' | 'VIDEO',
        url: `${MOCK_CDN_BASE}/g2.jpg`,
        thumbnailUrl: null as string | null,
        durationSec: null as number | null,
        order: 2,
      },
    ],
    schedule: DAYS.map((day) => ({ day, isOff: day === 'FRI', open: '09:00', close: '21:00' })),
    closures: [
      {
        id: uid('64b', 1),
        from: '2026-12-24',
        to: '2026-12-25',
        reason: 'Holiday',
        editable: true,
      },
    ],
    services: [
      {
        id: uid('64d', 1),
        catalogServiceId: MOCK_CATALOG_SERVICE,
        name: 'Haircut',
        imageUrl: `${MOCK_CDN_BASE}/s1.jpg`,
        price: '15.000',
        durationMinutes: 45,
        brideOnly: false,
        extraDescription: null as string | null,
        mediaUrls: [] as string[],
        active: true,
      },
    ],
    staff: new Map<
      string,
      {
        memberId: string;
        providesServices: boolean;
        bio: string | null;
        yearsOfExperience: number | null;
        serviceIds: string[];
        brideQualified: boolean;
        workingDays: { day: Day; start: string | null; end: string | null }[];
        rating: { avg: number; count: number };
        customersCount: number;
      }
    >(),
    policy: null as null | {
      cancellationWindowHours: number;
      paymentOptions: ('PAY_ON_ARRIVAL' | 'DEPOSIT' | 'FULL_ONLINE')[];
      depositPercentage: number | null;
      depositRefundableOnCustomerCancel: boolean;
      fullPaymentRefundOnCustomerCancel: 'FULL' | 'MINUS_DEPOSIT';
      noShowDeposit: 'KEEP' | 'REFUND';
      noShowFullPayment: 'KEEP' | 'REFUND_MINUS_DEPOSIT' | 'REFUND_FULL';
      notes: string | null;
    },
    seq: 10,
  };
}

export type SalonEditState = ReturnType<typeof salonState>;

/** One lazily created state per salon id, shared by the salon-edit mock routes. */
export function salonEditStore() {
  const states = new Map<string, SalonEditState>();
  return (id: string | undefined): SalonEditState => {
    const key = id ?? '';
    let s = states.get(key);
    if (!s) {
      s = salonState(key);
      states.set(key, s);
    }
    return s;
  };
}

/** The request body without the audit `reason`, which the mock does not store. */
export const withoutReason = (body: unknown): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => k !== 'reason'),
  );
