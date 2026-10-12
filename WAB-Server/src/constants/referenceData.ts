/** Reference data (SRV-018): shapes of countries/cities/areas and the starter data for Jordan. */
export const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
export const DIAL_CODE_PATTERN = /^\+[1-9][0-9]{0,3}$/;

export interface LocalizedName {
  readonly ar: string;
  readonly en: string;
}

export interface SeedCountry {
  readonly code: string;
  readonly name: LocalizedName;
  readonly dialCode: string;
  /** Storage key of the flag image (the file itself comes with the storage task). */
  readonly flagKey: string;
  /** Tested against the national number, digits only, without the leading 0. */
  readonly phoneRegex: string;
  readonly sortOrder: number;
}

export interface SeedCity {
  readonly countryCode: string;
  readonly name: LocalizedName;
  readonly sortOrder: number;
}

export interface SeedArea {
  /** English name of the city the area belongs to. */
  readonly city: string;
  readonly name: LocalizedName;
  readonly sortOrder: number;
}

export const JORDAN_CODE = 'JO';

export const SEED_COUNTRIES: readonly SeedCountry[] = [
  {
    code: JORDAN_CODE,
    name: { ar: 'الأردن', en: 'Jordan' },
    dialCode: '+962',
    flagKey: 'flags/jo.svg',
    // Mobile numbers: Zain 77, Orange 77/78, Umniah 78/79, then 7 digits.
    phoneRegex: '^7[789][0-9]{7}$',
    sortOrder: 1,
  },
];

/** The 12 governorate capitals, in the usual order. */
export const SEED_CITIES: readonly SeedCity[] = [
  { countryCode: JORDAN_CODE, name: { ar: 'عمّان', en: 'Amman' }, sortOrder: 1 },
  { countryCode: JORDAN_CODE, name: { ar: 'إربد', en: 'Irbid' }, sortOrder: 2 },
  { countryCode: JORDAN_CODE, name: { ar: 'الزرقاء', en: 'Zarqa' }, sortOrder: 3 },
  { countryCode: JORDAN_CODE, name: { ar: 'العقبة', en: 'Aqaba' }, sortOrder: 4 },
  { countryCode: JORDAN_CODE, name: { ar: 'السلط', en: 'Salt' }, sortOrder: 5 },
  { countryCode: JORDAN_CODE, name: { ar: 'مادبا', en: 'Madaba' }, sortOrder: 6 },
  { countryCode: JORDAN_CODE, name: { ar: 'جرش', en: 'Jerash' }, sortOrder: 7 },
  { countryCode: JORDAN_CODE, name: { ar: 'عجلون', en: 'Ajloun' }, sortOrder: 8 },
  { countryCode: JORDAN_CODE, name: { ar: 'الكرك', en: 'Karak' }, sortOrder: 9 },
  { countryCode: JORDAN_CODE, name: { ar: 'الطفيلة', en: 'Tafilah' }, sortOrder: 10 },
  { countryCode: JORDAN_CODE, name: { ar: 'معان', en: "Ma'an" }, sortOrder: 11 },
  { countryCode: JORDAN_CODE, name: { ar: 'المفرق', en: 'Mafraq' }, sortOrder: 12 },
];

/**
 * Starter areas for Amman only: the five named in the Design Script plus common ones. Other
 * cities' areas are added by the admin in Settings → Locations.
 */
export const SEED_AREAS: readonly SeedArea[] = [
  { city: 'Amman', name: { ar: 'عبدون', en: 'Abdoun' }, sortOrder: 1 },
  { city: 'Amman', name: { ar: 'الجاردنز', en: 'Gardens' }, sortOrder: 2 },
  { city: 'Amman', name: { ar: 'أم أذينة', en: 'Um Uthaina' }, sortOrder: 3 },
  { city: 'Amman', name: { ar: 'الصويفية', en: 'Sweifieh' }, sortOrder: 4 },
  { city: 'Amman', name: { ar: 'خلدا', en: 'Khalda' }, sortOrder: 5 },
  { city: 'Amman', name: { ar: 'الشميساني', en: 'Shmeisani' }, sortOrder: 6 },
  { city: 'Amman', name: { ar: 'دابوق', en: 'Dabouq' }, sortOrder: 7 },
  { city: 'Amman', name: { ar: 'الجبيهة', en: 'Jubeiha' }, sortOrder: 8 },
  { city: 'Amman', name: { ar: 'تلاع العلي', en: "Tla' Al-Ali" }, sortOrder: 9 },
  { city: 'Amman', name: { ar: 'الرابية', en: 'Al-Rabyeh' }, sortOrder: 10 },
  { city: 'Amman', name: { ar: 'جبل عمّان', en: 'Jabal Amman' }, sortOrder: 11 },
  { city: 'Amman', name: { ar: 'مرج الحمام', en: 'Marj Al-Hamam' }, sortOrder: 12 },
  { city: 'Amman', name: { ar: 'ماركا', en: 'Marka' }, sortOrder: 13 },
  { city: 'Amman', name: { ar: 'طبربور', en: 'Tabarbour' }, sortOrder: 14 },
];
