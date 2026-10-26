import type { Gender } from './enums';
import type { LocalizedName } from './referenceData';
import type { SalonState } from './salon';

/**
 * Static sample data for `npm run seed:demo` (development only, refused in production). Everything
 * here is invented: no real salon, person or phone owner. Money is integer fils, times are salon-local.
 */

/** Seed of the deterministic ids and choices: the same input always gives the same data set. */
export const DEMO_SEED_LABEL = 'wab-demo-v1';
/** Prefix of every demo file key (images are uploaded by `seed:demo-images`). */
export const DEMO_FILE_PREFIX = 'demo';
export const DEMO_IMAGE_EXTENSION = 'jpg';
export const DEMO_IMAGE_CONTENT_TYPE = 'image/jpeg';
/** Upload records of demo files keep this size limit (bytes); the files are uploaded by script. */
export const DEMO_UPLOAD_MAX_BYTES = 5_000_000;

/** Bookings are spread from this many days before the seed run to this many days after it. */
export const DEMO_DAYS_BACK = 28;
export const DEMO_DAYS_AHEAD = 10;
/** Bookings per live salon and per day (upper bound; free staff and hours decide the rest). */
export const DEMO_BOOKINGS_PER_SALON_DAY = 2;
/** Companions on a demo booking stay well under the business limit (5). */
export const DEMO_MAX_COMPANIONS = 2;
/** First bookable minute of a demo appointment after opening, and the step between tries. */
export const DEMO_SLOT_STEP_MINUTES = 15;
export const DEMO_GATEWAY_FEE_PERCENT = 3;
export const DEMO_FAILED_PAYMENTS = 4;
export const DEMO_REPORT_DAYS = 14;
export const DEMO_APP_VERSION = '1.0.0';
export const DEMO_PAYMENT_PROVIDER = 'fake';
/** Demo admin actions are recorded as made from the machine that ran the seed. */
export const DEMO_AUDIT_IP = '127.0.0.1';
export const DEMO_AUDIT_USER_AGENT = 'wab-demo-seed';
export const DEMO_DEPOSIT_PERCENT = 30;
export const DEMO_CANCELLATION_WINDOW_HOURS = 12;
/** Subscription price per month (fils) recorded for active demo salons. */
export const DEMO_SUBSCRIPTION_FEE = 25_000;
export const DEMO_PLACEMENT_FEE = 40_000;
export const DEMO_TRIAL_DAYS = 90;
export const DEMO_SUBSCRIPTION_METHOD = 'BANK_TRANSFER';
export const DEMO_SUBSCRIPTION_MONTHS_PAID = 3;
export const DEMO_SUBSCRIPTION_REFERENCE_PREFIX = 'DEMO-SUB-';
export const DEMO_PLACEMENT_NOTE = 'Paid by bank transfer (demo)';

/** Probability bands (0–1) used when the seed picks an outcome; the rest is the last outcome. */
export const DEMO_PAST_OUTCOMES = {
  COMPLETED: 0.62,
  NO_SHOW: 0.07,
  CANCELLED_BY_CUSTOMER: 0.1,
  REJECTED: 0.08,
  CANCELLED_BY_SALON: 0.06,
  AUTO_CANCELLED: 0.07,
} as const;
export const DEMO_FUTURE_OUTCOMES = {
  PENDING: 0.4,
  APPROVED: 0.45,
  CANCELLED_BY_CUSTOMER: 0.1,
  REJECTED: 0.05,
} as const;
/** Share of completed bookings that leave a salon review, and of those a staff review too. */
export const DEMO_REVIEW_SHARE = 0.7;
export const DEMO_STAFF_REVIEW_SHARE = 0.5;
export const DEMO_COMPANION_SHARE = 0.25;
export const DEMO_BRIDE_SHARE = 0.12;
export const DEMO_TWO_SERVICES_SHARE = 0.4;

export interface DemoAreaPoint {
  readonly area: string;
  readonly lat: number;
  readonly lng: number;
}

export interface DemoSalonServiceSpec {
  /** English catalog name (the demo catalog of the same gender). */
  readonly catalog: string;
  readonly price: number;
  readonly durationMinutes: number;
  readonly brideOnly?: boolean;
}

export interface DemoSalonSpec {
  readonly key: string;
  readonly name: string;
  readonly gender: Gender;
  readonly state: SalonState;
  readonly description: string;
  readonly place: DemoAreaPoint;
  readonly locationText: string;
  readonly phone: string;
  readonly whatsapp: string;
  /** Local opening hours; `offDays` are closed (SUN…SAT). */
  readonly open: string;
  readonly close: string;
  readonly offDays: readonly string[];
  readonly paymentOptions: readonly ('PAY_ON_ARRIVAL' | 'DEPOSIT' | 'FULL_ONLINE')[];
  /** Price multiplier in percent applied to the base service prices. */
  readonly pricePercent: number;
  readonly staff: number;
  readonly rejectionReason?: string;
  readonly offlineReason?: string;
}

/** Base services offered by demo salons, per gender (catalog names from `DEMO_SERVICES`). */
export const DEMO_SERVICE_SPECS: Readonly<Record<Gender, readonly DemoSalonServiceSpec[]>> = {
  FEMALE: [
    { catalog: 'Haircut', price: 15_000, durationMinutes: 45 },
    { catalog: 'Blow dry', price: 10_000, durationMinutes: 30 },
    { catalog: 'Hair coloring', price: 45_000, durationMinutes: 120 },
    { catalog: 'Keratin treatment', price: 80_000, durationMinutes: 150 },
    { catalog: 'Manicure', price: 8_000, durationMinutes: 30 },
    { catalog: 'Pedicure', price: 12_000, durationMinutes: 45 },
    { catalog: 'Makeup', price: 35_000, durationMinutes: 60 },
    { catalog: 'Bridal makeup', price: 150_000, durationMinutes: 120, brideOnly: true },
    { catalog: 'Facial', price: 25_000, durationMinutes: 60 },
    { catalog: 'Waxing', price: 15_000, durationMinutes: 30 },
    { catalog: 'Henna', price: 20_000, durationMinutes: 45 },
  ],
  MALE: [
    { catalog: 'Haircut', price: 5_000, durationMinutes: 30 },
    { catalog: 'Beard trim', price: 3_000, durationMinutes: 15 },
    { catalog: 'Shave', price: 4_000, durationMinutes: 20 },
    { catalog: 'Hair coloring', price: 12_000, durationMinutes: 45 },
    { catalog: 'Wash and style', price: 3_000, durationMinutes: 15 },
    { catalog: 'Facial', price: 10_000, durationMinutes: 30 },
    { catalog: 'Groom package', price: 60_000, durationMinutes: 90 },
  ],
};

const PAY_ON_ARRIVAL = 'PAY_ON_ARRIVAL' as const;
const DEPOSIT = 'DEPOSIT' as const;
const FULL_ONLINE = 'FULL_ONLINE' as const;

/**
 * `description` and `locationText` are single-language salon text (BUSINESS_DOMAIN §3.3/§3.3a), so the demo
 * writes them in English: every language then reads the same sample (SRV-151, CUS-060 #15).
 */
export const DEMO_SALONS: readonly DemoSalonSpec[] = [
  {
    key: 'lamar',
    name: 'Lamar Beauty Lounge',
    gender: 'FEMALE',
    state: 'LIVE',
    description:
      'A full-service ladies salon in Abdoun: hair, nails, makeup and skin care by a professional team in a calm setting.',
    place: { area: 'Abdoun', lat: 31.9539, lng: 35.8822 },
    locationText: 'Abdoun, Cairo Street, next to Abdoun Circle',
    phone: '+96265921001',
    whatsapp: '+962790921001',
    open: '10:00',
    close: '20:00',
    offDays: ['FRI'],
    paymentOptions: [PAY_ON_ARRIVAL, DEPOSIT],
    pricePercent: 120,
    staff: 4,
  },
  {
    key: 'rose',
    name: 'Rose Bridal Studio',
    gender: 'FEMALE',
    state: 'LIVE',
    description:
      'Bridal and occasion specialists in Sweifieh: bridal makeup, hair styling and henna for the whole party.',
    place: { area: 'Sweifieh', lat: 31.9566, lng: 35.859 },
    locationText: 'Sweifieh, Wakalat Street, 2nd floor',
    phone: '+96265921002',
    whatsapp: '+962790921002',
    open: '11:00',
    close: '21:00',
    offDays: ['SUN'],
    paymentOptions: [PAY_ON_ARRIVAL, DEPOSIT, FULL_ONLINE],
    pricePercent: 140,
    staff: 4,
  },
  {
    key: 'joury',
    name: 'Joury Ladies Salon',
    gender: 'FEMALE',
    state: 'LIVE',
    description:
      'A family salon in Khalda at fair prices: cuts, blow-dry, coloring, nails and occasion makeup.',
    place: { area: 'Khalda', lat: 31.993, lng: 35.838 },
    locationText: 'Khalda, Wasfi Al-Tal Street, Al-Nakheel Complex',
    phone: '+96265921003',
    whatsapp: '+962790921003',
    open: '09:00',
    close: '19:00',
    offDays: ['FRI'],
    paymentOptions: [PAY_ON_ARRIVAL],
    pricePercent: 90,
    staff: 3,
  },
  {
    key: 'ostaz',
    name: 'Al-Ostaz Barber Shop',
    gender: 'MALE',
    state: 'LIVE',
    description: 'A classic barber shop in Shmeisani: cuts, beard, razor shave and groom packages.',
    place: { area: 'Shmeisani', lat: 31.97, lng: 35.902 },
    locationText: 'Shmeisani, Abdul Hamid Sharaf Street',
    phone: '+96265921004',
    whatsapp: '+962790921004',
    open: '10:00',
    close: '22:00',
    offDays: [],
    paymentOptions: [PAY_ON_ARRIVAL],
    pricePercent: 100,
    staff: 4,
  },
  {
    key: 'gentlemen',
    name: "Gentlemen's Corner",
    gender: 'MALE',
    state: 'LIVE',
    description:
      'A modern grooming lounge in Dabouq: precise fades, beard sculpting, hot-towel shaves and facials.',
    place: { area: 'Dabouq', lat: 31.988, lng: 35.816 },
    locationText: 'Dabouq, King Abdullah II Street, near the roundabout',
    phone: '+96265921005',
    whatsapp: '+962790921005',
    open: '12:00',
    close: '23:00',
    offDays: ['MON'],
    paymentOptions: [PAY_ON_ARRIVAL, DEPOSIT],
    pricePercent: 160,
    staff: 3,
  },
  {
    key: 'classic',
    name: 'Classic Cuts Jubeiha',
    gender: 'MALE',
    state: 'LIVE',
    description: 'A men’s salon near the University of Jordan: modern cuts at student prices.',
    place: { area: 'Jubeiha', lat: 32.017, lng: 35.872 },
    locationText: 'Jubeiha, Yajouz Street, opposite the shopping complex',
    phone: '+96265921006',
    whatsapp: '+962790921006',
    open: '10:00',
    close: '21:00',
    offDays: ['FRI'],
    paymentOptions: [PAY_ON_ARRIVAL, FULL_ONLINE],
    pricePercent: 80,
    staff: 3,
  },
  {
    key: 'nour',
    name: 'Nour Hair Studio',
    gender: 'FEMALE',
    state: 'OFFLINE',
    description: 'A hair studio in Shmeisani specialised in keratin and coloring.',
    place: { area: 'Gardens', lat: 31.989, lng: 35.865 },
    locationText: 'Gardens, Wasfi Al-Tal Street',
    phone: '+96265921007',
    whatsapp: '+962790921007',
    open: '10:00',
    close: '19:00',
    offDays: ['FRI'],
    paymentOptions: [PAY_ON_ARRIVAL],
    pricePercent: 110,
    staff: 3,
    offlineReason: 'Subscription expired; waiting for the renewal payment.',
  },
  {
    key: 'fade',
    name: 'Fade Masters',
    gender: 'MALE',
    state: 'APPROVED_INCOMPLETE',
    description: '',
    place: { area: 'Um Uthaina', lat: 31.969, lng: 35.869 },
    locationText: '',
    phone: '+96265921008',
    whatsapp: '+962790921008',
    open: '10:00',
    close: '20:00',
    offDays: ['FRI'],
    paymentOptions: [PAY_ON_ARRIVAL],
    pricePercent: 100,
    staff: 0,
  },
  {
    key: 'bella',
    name: 'Bella Nails & Spa',
    gender: 'FEMALE',
    state: 'APPLICATION_PENDING',
    description: '',
    place: { area: 'Sweifieh', lat: 31.955, lng: 35.861 },
    locationText: '',
    phone: '+96265921009',
    whatsapp: '+962790921009',
    open: '10:00',
    close: '20:00',
    offDays: ['FRI'],
    paymentOptions: [PAY_ON_ARRIVAL],
    pricePercent: 100,
    staff: 0,
  },
  {
    key: 'sharp',
    name: 'Sharp Look Barbers',
    gender: 'MALE',
    state: 'APPLICATION_REJECTED',
    description: '',
    place: { area: 'Marka', lat: 31.976, lng: 35.98 },
    locationText: '',
    phone: '+96265921010',
    whatsapp: '+962790921010',
    open: '10:00',
    close: '20:00',
    offDays: ['FRI'],
    paymentOptions: [PAY_ON_ARRIVAL],
    pricePercent: 100,
    staff: 0,
    rejectionReason: 'The commercial license photo is not readable. Please upload a clear copy.',
  },
];

export const DEMO_FIRST_NAMES: Readonly<Record<Gender, readonly string[]>> = {
  FEMALE: [
    'Rana',
    'Lina',
    'Dana',
    'Hala',
    'Sara',
    'Maya',
    'Noor',
    'Reem',
    'Aya',
    'Farah',
    'Tala',
    'Leen',
    'Jana',
    'Yara',
    'Mais',
    'Haya',
    'Ruba',
    'Shahd',
    'Nada',
    'Dima',
    'Rasha',
    'Salma',
    'Zeina',
    'Raghad',
  ],
  MALE: [
    'Omar',
    'Khaled',
    'Ahmad',
    'Yazan',
    'Fadi',
    'Saif',
    'Majd',
    'Zaid',
    'Hamza',
    'Laith',
    'Qais',
    'Tareq',
    'Mohammad',
    'Ali',
    'Anas',
    'Basel',
    'Hasan',
    'Kareem',
    'Mahmoud',
    'Nasser',
    'Rami',
    'Sami',
    'Wael',
    'Yousef',
  ],
};
export const DEMO_LAST_NAMES: readonly string[] = [
  'Haddad',
  'Khoury',
  'Nasser',
  'Saleh',
  'Masri',
  'Qasem',
  'Odeh',
  'Hijazi',
  'Zoubi',
  'Abbadi',
  'Shami',
  'Tamimi',
  'Smadi',
  'Rawashdeh',
  'Majali',
  'Fayez',
  'Bataineh',
  'Obeidat',
];
export const DEMO_CUSTOMERS_PER_GENDER = 12;
/** Demo mobile numbers: national part (9 digits, Jordan) = prefix + a 4-digit index. */
export const DEMO_CUSTOMER_PHONE_PREFIX = '79900';
export const DEMO_MEMBER_PHONE_PREFIX = '78900';
export const DEMO_PHONE_INDEX_DIGITS = 4;
export const DEMO_EMAIL_DOMAIN = 'demo.wab.test';

export const DEMO_STAFF_BIOS: readonly string[] = [
  'خبرة طويلة في القص والتصفيف، وتحب التفاصيل الدقيقة.',
  'Specialist in color and treatments; trained in Beirut and Dubai.',
  'هادئ ودقيق، متخصص بالذقن والحلاقة الكلاسيكية.',
  'Loves bold looks and occasion styling.',
  'تهتم بصحة الشعر والبشرة قبل كل شيء.',
  'Fast, friendly and always on time.',
];

export const DEMO_REVIEW_COMMENTS: readonly string[] = [
  'تجربة ممتازة، الموظفين محترفين والمكان نظيف جدًا.',
  'Great service and very punctual. Will book again.',
  'الأسعار مناسبة والنتيجة أحلى من المتوقع.',
  'Friendly staff, but I waited ten minutes past my time.',
  'أفضل صالون جربته في عمّان، أنصح فيه.',
  'The result was exactly what I asked for.',
  'خدمة جيدة لكن المكان كان مزدحمًا.',
  'Clean, calm and professional. Loved it.',
];
/** Rating distribution of demo reviews (stars, most of them positive). */
export const DEMO_REVIEW_RATINGS: readonly number[] = [5, 5, 5, 4, 4, 4, 3, 5, 4, 2];

export const DEMO_CLOSURE_REASON = 'Staff training day';
export const DEMO_LEAVE_NOTE = 'Annual leave';
export const DEMO_REJECTION_REASON_CODE = 'FULLY_BOOKED';
export const DEMO_REJECTION_REASON_TEXT = 'Sorry, we are fully booked at that time.';
export const DEMO_SALON_CANCEL_REASON_CODE = 'STAFF_UNAVAILABLE';
export const DEMO_SALON_CANCEL_REASON_TEXT = 'The stylist is sick today. Please book another time.';
export const DEMO_CUSTOMER_CANCEL_TEXT = 'Change of plans.';

export interface DemoCatalogRequestSpec {
  readonly salon: string;
  readonly name: string;
  readonly description: string;
  readonly status: 'PENDING' | 'APPROVED' | 'REJECTED';
  readonly adminNote?: string;
}
export const DEMO_CATALOG_REQUESTS: readonly DemoCatalogRequestSpec[] = [
  {
    salon: 'lamar',
    name: 'Lash lifting',
    description: 'Lift and tint for natural lashes',
    status: 'PENDING',
  },
  {
    salon: 'gentlemen',
    name: 'Hair tattoo',
    description: 'Line designs shaved into the hair',
    status: 'REJECTED',
    adminNote: 'Too close to the haircut service; add it as a haircut option instead.',
  },
  {
    salon: 'rose',
    name: 'Hair extensions',
    description: 'Clip-in and keratin bond extensions',
    status: 'PENDING',
  },
];

export interface DemoBannerSpec {
  readonly key: string;
  readonly gender: 'MALE' | 'FEMALE' | 'BOTH';
  readonly action: 'NONE' | 'SALON' | 'EXTERNAL_URL';
  readonly salon?: string;
  readonly url?: string;
}
export const DEMO_BANNERS: readonly DemoBannerSpec[] = [
  { key: 'welcome', gender: 'BOTH', action: 'NONE' },
  { key: 'bridal-season', gender: 'FEMALE', action: 'SALON', salon: 'rose' },
  { key: 'grooming', gender: 'MALE', action: 'SALON', salon: 'gentlemen' },
  { key: 'tips', gender: 'BOTH', action: 'EXTERNAL_URL', url: 'https://example.com/wab-tips' },
];
/** Banners run from this many days ago to this many days ahead. */
export const DEMO_BANNER_WINDOW_DAYS = 30;

export const DEMO_GALLERY_IMAGES_PER_SALON = 4;

export interface DemoContentText {
  readonly PRIVACY: LocalizedName;
  readonly TERMS: LocalizedName;
  readonly ABOUT: LocalizedName;
}
export const DEMO_CONTENT: DemoContentText = {
  PRIVACY: {
    ar: 'نحترم خصوصيتك. نجمع فقط البيانات اللازمة لتقديم خدمة الحجز (الاسم، رقم الهاتف، المدينة) ولا نبيعها لأي طرف. يمكنك طلب حذف حسابك في أي وقت من الإعدادات.',
    en: 'We respect your privacy. We only collect what the booking service needs (name, phone number, city) and never sell it. You can ask to delete your account at any time from Settings.',
  },
  TERMS: {
    ar: 'باستخدامك التطبيق فإنك توافق على سياسة الإلغاء الخاصة بكل صالون كما تظهر قبل تأكيد الحجز. الأسعار بالدينار الأردني وتشمل الضريبة.',
    en: "By using the app you accept each salon's cancellation policy as shown before you confirm a booking. Prices are in Jordanian dinars and include tax.",
  },
  ABOUT: {
    ar: 'WAB منصة أردنية لحجز مواعيد الصالونات الرجالية والنسائية بسهولة، مع تأكيد فوري من الصالون.',
    en: 'WAB is a Jordanian platform to book men’s and women’s salons easily, with instant confirmation from the salon.',
  },
};

export interface DemoFaq {
  readonly question: LocalizedName;
  readonly answer: LocalizedName;
}
export const DEMO_FAQS: Readonly<Record<'CUSTOMER' | 'MERCHANT', readonly DemoFaq[]>> = {
  CUSTOMER: [
    {
      question: { ar: 'هل استخدام التطبيق مجاني؟', en: 'Is the app free to use?' },
      answer: { ar: 'نعم، الحجز مجاني للعملاء.', en: 'Yes, booking is free for customers.' },
    },
    {
      question: { ar: 'كيف ألغي حجزي؟', en: 'How do I cancel a booking?' },
      answer: {
        ar: 'من صفحة الحجز اضغط "إلغاء". تُطبق سياسة الصالون على المبلغ المدفوع.',
        en: "Open the booking and tap Cancel. The salon's policy applies to any amount paid.",
      },
    },
    {
      question: { ar: 'هل يمكنني الحجز لأشخاص آخرين؟', en: 'Can I book for other people?' },
      answer: {
        ar: 'نعم، حتى خمسة مرافقين في نفس الحجز.',
        en: 'Yes, up to five companions in the same booking.',
      },
    },
  ],
  MERCHANT: [
    {
      question: { ar: 'متى يظهر صالوني للعملاء؟', en: 'When does my salon appear to customers?' },
      answer: {
        ar: 'بعد موافقة الإدارة واكتمال الملف (الصور، الساعات، الخدمات، الموظفين والسياسة).',
        en: 'After admin approval and once your profile is complete (photos, hours, services, staff and policy).',
      },
    },
    {
      question: { ar: 'كم مدة الفترة المجانية؟', en: 'How long is the free period?' },
      answer: { ar: 'ثلاثة أشهر من تاريخ الموافقة.', en: 'Three months from approval.' },
    },
  ],
};

export const DEMO_CONTACT = {
  CUSTOMER: { phone: '+96265000100', whatsapp: '+962790000100', email: 'support@demo.wab.test' },
  MERCHANT: { phone: '+96265000200', whatsapp: '+962790000200', email: 'partners@demo.wab.test' },
} as const;
export const DEMO_STORE_URLS = {
  ANDROID: 'https://play.google.com/store/apps/details?id=com.example.wab',
  IOS: 'https://apps.apple.com/app/id0000000000',
} as const;
export const DEMO_MAINTENANCE_MESSAGE: LocalizedName = {
  ar: 'نقوم بتحسينات سريعة، نعود خلال دقائق.',
  en: 'We are making quick improvements. Back in a few minutes.',
};

export interface DemoCampaignSpec {
  readonly key: string;
  readonly title: LocalizedName;
  readonly body: LocalizedName;
  readonly gender?: Gender;
  /** Days from the seed run (negative = already sent). */
  readonly dayOffset: number;
}
export const DEMO_CAMPAIGNS: readonly DemoCampaignSpec[] = [
  {
    key: 'eid',
    title: { ar: 'عروض العيد', en: 'Eid offers' },
    body: {
      ar: 'احجز موعدك قبل العيد واستمتع بخصومات الصالونات.',
      en: 'Book before Eid and enjoy salon offers.',
    },
    dayOffset: -7,
  },
  {
    key: 'brides',
    title: { ar: 'موسم الأعراس', en: 'Wedding season' },
    body: {
      ar: 'باقات العرائس متوفرة الآن في صالونات مختارة.',
      en: 'Bridal packages are now available at selected salons.',
    },
    gender: 'FEMALE',
    dayOffset: 3,
  },
];

/**
 * `npm run seed:demo-images -- <folder>`: sub-folder of the owner's photo folder that feeds each
 * kind of demo file. A file named like the key's file name (e.g. `catalog/haircut.jpg`) is used for
 * that key; the other keys take the folder's remaining photos in turn.
 */
export const DEMO_IMAGE_FOLDERS = {
  SALON_COVER: 'covers',
  SALON_PROFILE: 'profiles',
  GALLERY_IMAGE: 'gallery',
  MEMBER_PHOTO: 'staff',
  CUSTOMER_AVATAR: 'customers',
  BANNER_IMAGE: 'banners',
  CATALOG_IMAGE: 'catalog',
  LICENSE_DOCUMENT: 'licenses',
} as const;
export const DEMO_IMAGE_SOURCE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'] as const;
/** Uploaded demo photos are re-encoded as JPEG no wider than this, like a phone upload. */
export const DEMO_IMAGE_MAX_WIDTH = 1_600;
export const DEMO_IMAGE_QUALITY = 82;

/** Extra branches of demo salons (§3.3a), added after every salon got its main branch. */
export interface DemoBranchSpec {
  /** The demo salon (`DemoSalonSpec.key`). */
  readonly salon: string;
  readonly key: string;
  readonly name: { readonly ar: string; readonly en: string };
  readonly place: DemoAreaPoint;
  readonly locationText: string;
  readonly phone: string;
  readonly open: string;
  readonly close: string;
  readonly offDays: readonly string[];
  /** Prices of the main branch's services in percent (each branch has its own prices). */
  readonly pricePercent: number;
  /** A branch manager plus employees, all serving every regular service of the branch. */
  readonly staff: number;
}

export const DEMO_BRANCHES: readonly DemoBranchSpec[] = [
  {
    salon: 'lamar',
    key: 'khalda',
    name: { ar: 'خلدا', en: 'Khalda' },
    place: { area: 'Khalda', lat: 31.9946, lng: 35.8366 },
    locationText: 'Khalda, Wasfi Al-Tal Street, opposite Al-Husseini Complex',
    phone: '+96265921011',
    open: '10:00',
    close: '22:00',
    offDays: ['FRI'],
    pricePercent: 90,
    staff: 2,
  },
  {
    salon: 'lamar',
    key: 'dabouq',
    name: { ar: 'دابوق', en: 'Dabouq' },
    place: { area: 'Dabouq', lat: 31.9899, lng: 35.8062 },
    locationText: 'Dabouq, King Abdullah II Street, Plaza 7',
    phone: '+96265921012',
    open: '11:00',
    close: '20:00',
    offDays: ['SAT'],
    pricePercent: 110,
    staff: 2,
  },
  {
    salon: 'ostaz',
    key: 'shmeisani',
    name: { ar: 'الشميساني', en: 'Shmeisani' },
    place: { area: 'Shmeisani', lat: 31.9706, lng: 35.9006 },
    locationText: 'Shmeisani, Abdul Hamid Sharaf Street',
    phone: '+96265921014',
    open: '09:00',
    close: '23:00',
    offDays: [],
    pricePercent: 100,
    staff: 2,
  },
  // SRV-160: two women's and two men's salons with 2–4 branches each, for the merchant app.
  // Append only: the order fixes the branch staff phone numbers (DEMO_ACCOUNTS.md).
  {
    salon: 'lamar',
    key: 'gardens',
    name: { ar: 'الجاردنز', en: 'Gardens' },
    place: { area: 'Gardens', lat: 31.9862, lng: 35.8689 },
    locationText: 'Gardens, Wasfi Al-Tal Street, Al-Sharq Complex',
    phone: '+96265921015',
    open: '10:00',
    close: '21:00',
    offDays: ['FRI'],
    pricePercent: 100,
    staff: 3,
  },
  {
    salon: 'rose',
    key: 'rabyeh',
    name: { ar: 'الرابية', en: 'Al-Rabyeh' },
    place: { area: 'Al-Rabyeh', lat: 31.9785, lng: 35.8806 },
    locationText: 'Al-Rabyeh, Abdul Rahim Al-Waked Street',
    phone: '+96265921016',
    open: '11:00',
    close: '21:00',
    offDays: ['SUN'],
    pricePercent: 95,
    staff: 3,
  },
  {
    salon: 'rose',
    key: 'jabal-amman',
    name: { ar: 'جبل عمّان', en: 'Jabal Amman' },
    place: { area: 'Jabal Amman', lat: 31.9515, lng: 35.9239 },
    locationText: 'Jabal Amman, Rainbow Street, near the First Circle',
    phone: '+96265921017',
    open: '12:00',
    close: '22:00',
    offDays: ['FRI'],
    pricePercent: 105,
    staff: 3,
  },
  {
    salon: 'ostaz',
    key: 'tabarbour',
    name: { ar: 'طبربور', en: 'Tabarbour' },
    place: { area: 'Tabarbour', lat: 32.0077, lng: 35.937 },
    locationText: 'Tabarbour, Al-Shaheed Street, next to the mosque',
    phone: '+96265921018',
    open: '10:00',
    close: '22:00',
    offDays: ['FRI'],
    pricePercent: 85,
    staff: 3,
  },
  {
    salon: 'gentlemen',
    key: 'sweifieh',
    name: { ar: 'الصويفية', en: 'Sweifieh' },
    place: { area: 'Sweifieh', lat: 31.9571, lng: 35.8606 },
    locationText: 'Sweifieh, Al-Wakalat Street, Plaza Mall ground floor',
    phone: '+96265921019',
    open: '12:00',
    close: '23:00',
    offDays: ['MON'],
    pricePercent: 150,
    staff: 3,
  },
  {
    salon: 'gentlemen',
    key: 'um-uthaina',
    name: { ar: 'أم أذينة', en: 'Um Uthaina' },
    place: { area: 'Um Uthaina', lat: 31.9707, lng: 35.8716 },
    locationText: 'Um Uthaina, Saad Bin Abi Waqqas Street',
    phone: '+96265921020',
    open: '11:00',
    close: '22:00',
    offDays: ['SUN'],
    pricePercent: 140,
    staff: 3,
  },
];
/** Bookings per open day of an extra branch (at least one, so every branch has a calendar). */
export const DEMO_BRANCH_BOOKINGS_PER_DAY = { min: 1, max: 2 } as const;
/** A branch closure and a staff leave land this many days after the last booked day. */
export const DEMO_BRANCH_CLOSURE_AFTER_DAYS = { min: 2, max: 8 } as const;
export const DEMO_BRANCH_LEAVE_AFTER_DAYS = { min: 9, max: 14 } as const;
export const DEMO_BRANCH_LEAVE_LENGTH_DAYS = 2;
/** Branch staff phones: national part = prefix + a 4-digit index (apart from the salon staff). */
export const DEMO_BRANCH_MEMBER_PHONE_PREFIX = '78901';
