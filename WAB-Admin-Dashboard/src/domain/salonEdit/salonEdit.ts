export const WEEK_DAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
export const PAYMENT_OPTIONS = ['PAY_ON_ARRIVAL', 'DEPOSIT', 'FULL_ONLINE'] as const;
export const FULL_PAYMENT_REFUNDS = ['FULL', 'MINUS_DEPOSIT'] as const;
export const NO_SHOW_DEPOSITS = ['KEEP', 'REFUND'] as const;
export const NO_SHOW_FULL_PAYMENTS = ['KEEP', 'REFUND_MINUS_DEPOSIT', 'REFUND_FULL'] as const;
export const GALLERY_TYPES = ['IMAGE', 'VIDEO'] as const;

export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface SalonProfile {
  readonly id: string;
  readonly name: string;
  readonly gender: 'MALE' | 'FEMALE';
  readonly state: string;
  readonly description: string | null;
  readonly coverUrl: string | null;
  readonly profileUrl: string | null;
  readonly coverKey: string | null;
  readonly profileKey: string | null;
  readonly location: GeoPoint | null;
  readonly locationText: string | null;
  readonly cityId: string | null;
  readonly areaId: string | null;
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly completeness: { readonly missing: readonly string[]; readonly isComplete: boolean };
}

/** Only what changed; `null` clears an optional field. */
export interface ProfilePatch {
  name?: string;
  description?: string | null;
  coverKey?: string | null;
  profileKey?: string | null;
  location?: GeoPoint | null;
  locationText?: string | null;
  cityId?: string;
  areaId?: string;
  phone?: string;
  whatsapp?: string | null;
}

export interface GalleryItem {
  readonly id: string;
  readonly type: (typeof GALLERY_TYPES)[number];
  readonly url: string;
  readonly thumbnailUrl: string | null;
  readonly durationSec: number | null;
  readonly order: number;
}

export interface NewGalleryItem {
  readonly type: (typeof GALLERY_TYPES)[number];
  readonly key: string;
  readonly thumbnailKey?: string;
  readonly durationSec?: number;
}

export interface ScheduleDay {
  readonly day: WeekDay;
  readonly isOff: boolean;
  /** `HH:mm`, 24 hours, Asia/Amman. */
  readonly open: string;
  readonly close: string;
}

export interface Closure {
  readonly id: string;
  /** Local days `YYYY-MM-DD`. */
  readonly from: string;
  readonly to: string;
  /** Shown to customers. */
  readonly reason: string;
  readonly editable: boolean;
}

export interface HoursView {
  readonly weeklySchedule: readonly ScheduleDay[];
  readonly closures: readonly Closure[];
}

export interface BrokenBooking {
  readonly bookingId: string;
  readonly startsAt: string;
  readonly status: string;
}

export interface ClosureInput {
  readonly from: string;
  readonly to: string;
  readonly closureReason: string;
}

export interface SalonService {
  readonly id: string;
  readonly catalogServiceId: string;
  readonly name: string;
  readonly imageUrl: string;
  /** JOD, 3 decimals. */
  readonly price: string;
  readonly durationMinutes: number;
  readonly brideOnly: boolean;
  readonly extraDescription: string | null;
  readonly mediaUrls: readonly string[];
  readonly active: boolean;
}

export interface NewService {
  readonly catalogServiceId: string;
  readonly price: string;
  readonly durationMinutes: number;
  readonly brideOnly: boolean;
  readonly extraDescription?: string;
  readonly active: boolean;
}

export interface ServicePatch {
  price?: string;
  durationMinutes?: number;
  brideOnly?: boolean;
  extraDescription?: string | null;
  active?: boolean;
}

export interface StaffDay {
  readonly day: WeekDay;
  readonly start: string | null;
  readonly end: string | null;
}

export interface StaffProfile {
  readonly memberId: string;
  readonly providesServices: boolean;
  readonly bio: string | null;
  readonly yearsOfExperience: number | null;
  readonly serviceIds: readonly string[];
  readonly brideQualified: boolean;
  readonly workingDays: readonly StaffDay[];
  readonly customersCount: number;
}

export interface StaffInput {
  readonly providesServices: boolean;
  readonly bio?: string;
  readonly yearsOfExperience?: number;
  readonly serviceIds: readonly string[];
  readonly brideQualified: boolean;
  readonly workingDays: readonly { day: WeekDay; start?: string; end?: string }[];
}

export interface SalonPolicy {
  readonly cancellationWindowHours: number;
  readonly paymentOptions: readonly (typeof PAYMENT_OPTIONS)[number][];
  readonly depositPercentage: number | null;
  readonly depositRefundableOnCustomerCancel: boolean;
  readonly fullPaymentRefundOnCustomerCancel: (typeof FULL_PAYMENT_REFUNDS)[number];
  readonly noShowDeposit: (typeof NO_SHOW_DEPOSITS)[number];
  readonly noShowFullPayment: (typeof NO_SHOW_FULL_PAYMENTS)[number];
  readonly notes: string | null;
}

export interface PolicyInput extends Omit<SalonPolicy, 'depositPercentage' | 'notes'> {
  readonly depositPercentage?: number;
  readonly notes?: string;
}

/** Admin edits a salon on its behalf; every write carries the admin's reason (audited, owner notified). */
export interface SalonEditRepository {
  profile(salonId: string): Promise<SalonProfile>;
  updateProfile(salonId: string, patch: ProfilePatch, reason: string): Promise<SalonProfile>;
  gallery(salonId: string): Promise<readonly GalleryItem[]>;
  addGalleryItem(salonId: string, item: NewGalleryItem, reason: string): Promise<GalleryItem>;
  removeGalleryItem(salonId: string, itemId: string, reason: string): Promise<void>;
  reorderGallery(
    salonId: string,
    ids: readonly string[],
    reason: string,
  ): Promise<readonly GalleryItem[]>;
  hours(salonId: string): Promise<HoursView>;
  previewHours(salonId: string, days: readonly ScheduleDay[]): Promise<readonly BrokenBooking[]>;
  saveHours(salonId: string, days: readonly ScheduleDay[], reason: string): Promise<HoursView>;
  previewClosure(
    salonId: string,
    range: { from: string; to: string },
  ): Promise<readonly BrokenBooking[]>;
  addClosure(salonId: string, input: ClosureInput, reason: string): Promise<Closure>;
  updateClosure(
    salonId: string,
    closureId: string,
    patch: Partial<ClosureInput>,
    reason: string,
  ): Promise<Closure>;
  removeClosure(salonId: string, closureId: string, reason: string): Promise<void>;
  services(salonId: string): Promise<readonly SalonService[]>;
  addService(salonId: string, input: NewService, reason: string): Promise<SalonService>;
  updateService(
    salonId: string,
    serviceId: string,
    patch: ServicePatch,
    reason: string,
  ): Promise<SalonService>;
  staff(salonId: string, memberId: string): Promise<StaffProfile>;
  saveStaff(
    salonId: string,
    memberId: string,
    input: StaffInput,
    reason: string,
  ): Promise<StaffProfile>;
  policy(salonId: string): Promise<SalonPolicy | null>;
  savePolicy(salonId: string, input: PolicyInput, reason: string): Promise<SalonPolicy>;
}
