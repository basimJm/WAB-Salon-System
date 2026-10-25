import type { getSalonsByIdBranchesData } from '../contract/generated/dto';

/** One branch as the server returns it (BUSINESS_DOMAIN §3.3a). */
export type MockBranch = getSalonsByIdBranchesData[number];

const NOOR = '64f000000000000000000001';
const ROYAL = '64f000000000000000000002';
const LAMA = '64f000000000000000000003';
const AMMAN = '64a000000000000000000001';
const IRBID = '64a000000000000000000002';
const ABDOUN = '64a000000000000000000021';
const JUBEIHA = '64a000000000000000000022';

const OPEN_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'SAT'] as const;
const week = (): MockBranch['weeklySchedule'] => [
  ...OPEN_DAYS.map((day) => ({ day, isOff: false, open: '10:00', close: '20:00' })),
  { day: 'FRI' as const, isOff: true, open: '00:00', close: '00:00' },
];

interface Seed {
  n: number;
  ar: string;
  en: string;
  isMain: boolean;
  status: MockBranch['status'];
  cityId: string;
  areaId: string | null;
  missing?: string[];
}
const branch = ({ n, ar, en, isMain, status, cityId, areaId, missing = [] }: Seed): MockBranch => ({
  id: `64b0${String(n).padStart(20, '0')}`,
  name: { ar, en },
  isMain,
  status,
  location: { latitude: 31.95 + n / 100, longitude: 35.86 + n / 100 },
  locationText: `${en} street ${String(n)}`,
  cityId,
  areaId,
  phone: `+96279000${String(1000 + n)}`,
  whatsapp: n % 2 === 0 ? null : `+96279000${String(2000 + n)}`,
  weeklySchedule: week(),
  offline: status === 'OFFLINE' ? { reason: 'Renovation', at: '2026-10-20T09:00:00.000Z' } : null,
  completeness: { missing, isComplete: missing.length === 0 },
});

/** Branches per mock salon, main first: Noor has three (one offline and incomplete), the others one each. */
export const MOCK_BRANCHES: Readonly<Record<string, readonly MockBranch[]>> = {
  [NOOR]: [
    branch({
      n: 11,
      ar: 'عبدون',
      en: 'Abdoun',
      isMain: true,
      status: 'ACTIVE',
      cityId: AMMAN,
      areaId: ABDOUN,
    }),
    branch({
      n: 12,
      ar: 'خلدا',
      en: 'Khalda',
      isMain: false,
      status: 'ACTIVE',
      cityId: AMMAN,
      areaId: JUBEIHA,
    }),
    branch({
      n: 13,
      ar: 'دابوق',
      en: 'Dabouq',
      isMain: false,
      status: 'OFFLINE',
      cityId: AMMAN,
      areaId: null,
      missing: ['SERVICES', 'STAFF'],
    }),
  ],
  [ROYAL]: [
    branch({
      n: 21,
      ar: 'الرئيسي',
      en: 'Main',
      isMain: true,
      status: 'ACTIVE',
      cityId: AMMAN,
      areaId: null,
    }),
  ],
  [LAMA]: [
    branch({
      n: 31,
      ar: 'الرئيسي',
      en: 'Main',
      isMain: true,
      status: 'ACTIVE',
      cityId: IRBID,
      areaId: null,
      missing: ['HOURS'],
    }),
  ],
};

export const branchesOf = (salonId: string): MockBranch[] =>
  (MOCK_BRANCHES[salonId] ?? []).map((b) => ({ ...b }));

const ALL = Object.values(MOCK_BRANCHES).flat();
const NOOR_MAIN = MOCK_BRANCHES[NOOR]?.[0];
const NOOR_SECOND = MOCK_BRANCHES[NOOR]?.[1];

/** Ids used by the other fixtures (bookings, reviews, money) so the branch filters have something to find. */
export const MOCK_BRANCH_IDS = {
  noorMain: NOOR_MAIN?.id ?? '',
  noorSecond: NOOR_SECOND?.id ?? '',
} as const;

const find = (id: string) => ALL.find((b) => b.id === id);

/** The `branch` object of a booking row (server-localized name; the mock answers in English). */
export const bookingBranchRef = (id: string) => {
  const b = find(id);
  return b ? { id: b.id, name: b.name.en, locationText: b.locationText } : null;
};

/** The `branch` object of a review row. */
export const reviewBranchRef = (id: string) => {
  const b = find(id);
  return b ? { id: b.id, name: { ...b.name } } : null;
};
