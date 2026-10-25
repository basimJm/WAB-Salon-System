import type { Page, PageQuery } from '@/domain/shared/page';

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
export const BOOKING_TABS = ['PENDING', 'UPCOMING', 'TODAY', 'PAST'] as const;
export const PAYMENT_STATUSES = ['PAY_ON_ARRIVAL', 'DEPOSIT_PAID', 'FULLY_PAID', 'PAID'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingTab = (typeof BOOKING_TABS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface BookingSummary {
  readonly id: string;
  readonly referenceNumber: string;
  readonly status: string;
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
  readonly customer: { readonly id: string; readonly name: string; readonly phone: string } | null;
  readonly staff: readonly { readonly id: string; readonly name: string }[];
}
export interface BookingPerson {
  readonly name: string;
  readonly isBride: boolean;
  readonly start: string;
  readonly end: string;
  readonly subtotal: string;
  readonly staff: { readonly id: string; readonly name: string } | null;
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
    readonly remaining: string;
    readonly refunded: string;
  };
  readonly statusHistory: readonly {
    readonly status: string;
    readonly actorType: string;
    readonly reason: string | null;
    readonly at: string;
  }[];
  readonly rejection: {
    readonly reasonCode: string;
    readonly reasonText: string | null;
    readonly at: string;
  } | null;
  readonly cancellation: {
    readonly reasonCode: string;
    readonly reasonText: string | null;
    readonly at: string;
  } | null;
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
