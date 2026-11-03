import type { DemoAreaPoint } from './demoSeed';
import type { Audience, BusinessType } from './enums';

/**
 * Demo businesses for salons, clinics and tattoo studios (owner 2026-10-29 / 2026-11-03,
 * BUSINESS_DOMAIN.md §5.19, §5.23): two beauty clinics with two branches each, one salon for men
 * and women and one tattoo studio. Development only; added
 * by the demo seed insert-only (deterministic ids), also to a database seeded before clinics.
 */
export interface DemoBusinessServiceSpec {
  /** English name of the catalog entry (same business type). */
  readonly catalog: string;
  /** Catalog audience of the entry (a BOTH salon offers men's and women's services). */
  readonly audience: Audience;
  /** Integer fils at the main branch. */
  readonly price: number;
  readonly durationMinutes: number;
}

export interface DemoBusinessBranchSpec {
  readonly key: string;
  readonly name: { readonly ar: string; readonly en: string };
  readonly place: DemoAreaPoint;
  readonly locationText: string;
  readonly phone: string;
  readonly open: string;
  readonly close: string;
  readonly offDays: readonly string[];
  /** Prices of the main branch in percent. */
  readonly pricePercent: number;
}

export interface DemoBusinessSpec {
  readonly key: string;
  readonly name: string;
  readonly businessType: BusinessType;
  readonly audience: Audience;
  readonly description: string;
  readonly services: readonly DemoBusinessServiceSpec[];
  /** The first branch is the main one. */
  readonly branches: readonly DemoBusinessBranchSpec[];
  /** Staff per branch (the first one of each branch is its manager). */
  readonly staffPerBranch: number;
  /** In the Recommended section of its type right now. */
  readonly recommended: boolean;
}

/** Staff phones of these businesses: `+962` + prefix + index (other demo blocks use 78900/78901). */
export const DEMO_BUSINESS_MEMBER_PHONE_PREFIX = '78902';
/** Days before now the businesses applied and were approved. */
export const DEMO_BUSINESS_APPLIED_DAYS = 40;
export const DEMO_BUSINESS_APPROVED_DAYS = 35;
export const DEMO_BUSINESS_STAFF_YEARS = 5;
export const DEMO_BUSINESS_PERCENT = 100;

const WEEKEND: readonly string[] = ['FRI'];

export const DEMO_BUSINESSES: readonly DemoBusinessSpec[] = [
  {
    key: 'glow-clinic',
    name: 'Glow Aesthetic Clinic',
    businessType: 'CLINIC',
    audience: 'BOTH',
    description: 'Dermatology and aesthetic clinic: botox, filler, laser and skin care by doctors.',
    services: [
      { catalog: 'Botox', audience: 'BOTH', price: 120_000, durationMinutes: 30 },
      { catalog: 'Filler', audience: 'BOTH', price: 180_000, durationMinutes: 45 },
      { catalog: 'Laser hair removal', audience: 'BOTH', price: 60_000, durationMinutes: 60 },
      { catalog: 'HydraFacial', audience: 'BOTH', price: 45_000, durationMinutes: 60 },
    ],
    branches: [
      {
        key: 'abdoun',
        name: { ar: 'عبدون', en: 'Abdoun' },
        place: { area: 'Abdoun', lat: 31.9539, lng: 35.8796 },
        locationText: 'Abdoun, Cairo Street, Medical Tower 2nd floor',
        phone: '+96265931001',
        open: '10:00',
        close: '20:00',
        offDays: WEEKEND,
        pricePercent: 100,
      },
      {
        key: 'sweifieh',
        name: { ar: 'الصويفية', en: 'Sweifieh' },
        place: { area: 'Sweifieh', lat: 31.9566, lng: 35.8622 },
        locationText: 'Sweifieh, Wakalat Street, Building 14',
        phone: '+96265931002',
        open: '11:00',
        close: '21:00',
        offDays: WEEKEND,
        pricePercent: 95,
      },
    ],
    staffPerBranch: 2,
    recommended: true,
  },
  {
    key: 'derma-plus',
    name: 'Derma Plus Clinic',
    businessType: 'CLINIC',
    audience: 'BOTH',
    description: 'Skin and laser clinic: chemical peels, PRP and laser hair removal.',
    services: [
      { catalog: 'Chemical peel', audience: 'BOTH', price: 50_000, durationMinutes: 45 },
      { catalog: 'PRP', audience: 'BOTH', price: 90_000, durationMinutes: 45 },
      { catalog: 'Laser hair removal', audience: 'BOTH', price: 55_000, durationMinutes: 60 },
      { catalog: 'Botox', audience: 'BOTH', price: 110_000, durationMinutes: 30 },
    ],
    branches: [
      {
        key: 'gardens',
        name: { ar: 'الجاردنز', en: 'Gardens' },
        place: { area: 'Gardens', lat: 31.9871, lng: 35.8669 },
        locationText: 'Gardens, Wasfi Al-Tal Street, Clinic Center',
        phone: '+96265931003',
        open: '09:00',
        close: '19:00',
        offDays: WEEKEND,
        pricePercent: 100,
      },
      {
        key: 'khalda',
        name: { ar: 'خلدا', en: 'Khalda' },
        place: { area: 'Khalda', lat: 31.9961, lng: 35.8401 },
        locationText: 'Khalda, Amer Bin Malek Street',
        phone: '+96265931004',
        open: '10:00',
        close: '20:00',
        offDays: WEEKEND,
        pricePercent: 105,
      },
    ],
    staffPerBranch: 2,
    recommended: false,
  },
  {
    key: 'unity-salon',
    name: 'Unity Salon',
    businessType: 'SALON',
    audience: 'BOTH',
    description: 'A salon for men and women: haircuts, beard care, coloring and nails.',
    services: [
      { catalog: 'Haircut', audience: 'MALE', price: 8_000, durationMinutes: 30 },
      { catalog: 'Beard trim', audience: 'MALE', price: 5_000, durationMinutes: 20 },
      { catalog: 'Haircut', audience: 'FEMALE', price: 15_000, durationMinutes: 45 },
      { catalog: 'Hair coloring', audience: 'FEMALE', price: 35_000, durationMinutes: 90 },
      { catalog: 'Manicure', audience: 'FEMALE', price: 10_000, durationMinutes: 40 },
    ],
    branches: [
      {
        key: 'jubeiha',
        name: { ar: 'الجبيهة', en: 'Jubeiha' },
        place: { area: 'Jubeiha', lat: 32.0225, lng: 35.8717 },
        locationText: 'Jubeiha, Yajouz Street, near the University',
        phone: '+96265931005',
        open: '10:00',
        close: '22:00',
        offDays: WEEKEND,
        pricePercent: 100,
      },
    ],
    staffPerBranch: 3,
    recommended: true,
  },
  // Tattoo studio (owner 2026-11-03, §5.23): serves everyone, one branch.
  {
    key: 'black-needle',
    name: 'Black Needle Studio',
    businessType: 'TATTOO',
    audience: 'BOTH',
    description: 'Tattoo and piercing studio: custom designs, cover-ups, touch-ups and piercing.',
    services: [
      { catalog: 'Small tattoo', audience: 'BOTH', price: 40_000, durationMinutes: 60 },
      { catalog: 'Large tattoo session', audience: 'BOTH', price: 150_000, durationMinutes: 180 },
      { catalog: 'Cover-up tattoo', audience: 'BOTH', price: 120_000, durationMinutes: 150 },
      { catalog: 'Piercing', audience: 'BOTH', price: 15_000, durationMinutes: 30 },
    ],
    branches: [
      {
        key: 'jabal-amman',
        name: { ar: 'جبل عمان', en: 'Jabal Amman' },
        place: { area: 'Jabal Amman', lat: 31.9515, lng: 35.9239 },
        locationText: 'Jabal Amman, Rainbow Street, Studio 7',
        phone: '+96265931006',
        open: '12:00',
        close: '22:00',
        offDays: WEEKEND,
        pricePercent: 100,
      },
    ],
    staffPerBranch: 2,
    recommended: true,
  },
];
