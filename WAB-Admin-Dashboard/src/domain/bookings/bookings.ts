import type { Page, PageQuery } from '@/domain/shared/page';
import type { Audience, BusinessType, PersonGender } from '@/domain/shared/businessType';

export const BOOKING_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SALON',
  'AUTO_CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;
/** `TO_CLOSE` (§5.21): approved bookings whose end passed, oldest first. */
export const BOOKING_TABS = ['PENDING', 'UPCOMING', 'TODAY', 'PAST', 'TO_CLOSE'] as const;
/** Who made the booking (§5.20): the customer in the app, or the business for a customer. */
export const BOOKING_SOURCES = ['CUSTOMER_APP', 'MERCHANT'] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];
export const PAYMENT_STATUSES = ['PAY_ON_ARRIVAL', 'DEPOSIT_PAID', 'FULLY_PAID', 'PAID'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingTab = (typeof BOOKING_TABS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** A staff member on a booking (SRV-170): full name for the admin, first name and photo as the apps show them. */
export interface BookingStaff {
  readonly id: string;
  readonly name: string;
  readonly firstName: string;
  readonly photoUrl: string | null;
}
/** Why the salon or the admin refused or ended a booking. */
export interface BookingReason {
  readonly reasonCode: string;
  readonly reasonText: string | null;
  readonly at: string;
}

export interface BookingSummary {
  readonly id: string;
  readonly referenceNumber: string;
  readonly status: string;
  /** Snapshots of the salon/clinic at booking time (§5.19). */
  readonly businessType: BusinessType;
  readonly salonAudience: Audience;
  readonly paymentMethod: string;
  readonly paymentStatus: string;
  readonly hasBride: boolean;
  readonly appointmentStart: string;
  readonly appointmentEnd: string;
  readonly respondBy: string;
  /** When the customer sent the request (UTC instant; shown in Amman time). */
  readonly requestedAt: string;
  readonly personsCount: number;
  /** JOD amount as a 3-decimal string. */
  readonly total: string;
  readonly salon: { readonly id: string; readonly name: string } | null;
  /** Branch of the booking (name localized by the server); null for very old records. */
  readonly branch: {
    readonly id: string;
    readonly name: string;
    readonly locationText: string | null;
  } | null;
  /** `id` is null for a business-made booking of someone without the app (§5.20): the contact as entered. */
  readonly customer: {
    readonly id: string | null;
    readonly name: string;
    readonly phone: string;
  } | null;
  readonly source: BookingSource;
  /** The member who made a business booking (§5.20); null for app bookings. */
  readonly createdBy: { readonly id: string; readonly name: string } | null;
  readonly staff: readonly BookingStaff[];
  /** Set when the booking was rejected (list rows and details). */
  readonly rejection: BookingReason | null;
}
export interface BookingPerson {
  readonly name: string;
  readonly isBride: boolean;
  /** A BOTH salon or a clinic may book men and women together (§5.19); null when unknown. */
  readonly gender: PersonGender | null;
  /** Tattoo design image (§5.23): short-lived signed link; null when none. */
  readonly referenceImageUrl: string | null;
  readonly start: string;
  readonly end: string;
  readonly subtotal: string;
  readonly staff: BookingStaff | null;
  readonly services: readonly {
    readonly name: string;
    readonly price: string;
    readonly durationMinutes: number;
  }[];
}
export interface BookingDetails extends BookingSummary {
  readonly refundStatus: string;
  readonly persons: readonly BookingPerson[];
  readonly money: {
    readonly total: string;
    readonly dueOnline: string;
    readonly paidOnline: string;
    /** Still to pay at the salon now: 0 once the booking is final (COMPLETED, rejected, cancelled, no-show). */
    readonly remaining: string;
    /** Collected at the salon: the at-salon part when COMPLETED, else 0. */
    readonly paidAtSalon: string;
    readonly refunded: string;
  };
  readonly statusHistory: readonly {
    readonly status: string;
    readonly actorType: string;
    readonly reason: string | null;
    readonly at: string;
  }[];
  readonly cancellation: BookingReason | null;
  readonly createdAt: string;
}

export interface BookingQuery extends PageQuery {
  tab?: BookingTab;
  q?: string;
  from?: string;
  to?: string;
  status?: readonly BookingStatus[];
  brideOnly?: boolean;
  paymentStatus?: PaymentStatus;
  salonId?: string;
  branchId?: string;
  customerId?: string;
  businessType?: BusinessType;
  source?: BookingSource;
}
export interface StatusChangeResult {
  readonly referenceNumber: string;
  readonly status: string;
  /** The move is outside the normal flow (for example completing a cancelled booking). */
  readonly irregular: boolean;
}

export const CANCEL_MODES = ['CUSTOMER', 'SALON', 'ADMIN'] as const;
export type CancelMode = (typeof CANCEL_MODES)[number];

export interface EligibleStaff {
  readonly staffId: string;
  readonly name: string;
}

export interface RefundResult {
  readonly id: string;
  /** JOD amount as a 3-decimal string. */
  readonly amount: string;
  readonly status: string;
}

export interface BookingsRepository {
  list(query: BookingQuery): Promise<Page<BookingSummary>>;
  get(id: string): Promise<BookingDetails>;
  changeStatus(id: string, status: BookingStatus, reason: string): Promise<StatusChangeResult>;
  /** Staff who can take `personIndex` (0 = the customer) for the whole booking time. */
  eligibleStaff(id: string, personIndex: number): Promise<readonly EligibleStaff[]>;
  reassign(id: string, personIndex: number, staffId: string, reason: string): Promise<void>;
  /** Cancels with the rules of `mode` (the customer's, the salon's or the admin's own). */
  cancel(id: string, mode: CancelMode, reason: string): Promise<StatusChangeResult>;
  refund(id: string, amount: string, reason: string): Promise<RefundResult>;
}

export const isBookingStatus = (v: string | undefined): v is BookingStatus =>
  BOOKING_STATUSES.some((s) => s === v);
export const MAX_STATUS_REASON = 300;
