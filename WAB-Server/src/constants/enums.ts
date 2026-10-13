/** Domain enums (BUSINESS_DOMAIN.md §1). Each task adds the ones it needs. */
export const GENDERS = ['MALE', 'FEMALE'] as const;
/** Also the salon audience: MALE = men's salon, FEMALE = women's salon. */
export type Gender = (typeof GENDERS)[number];

/** Who performed an action (BUSINESS_DOMAIN.md §1 `ActorType`). */
export const ACTOR_TYPES = ['CUSTOMER', 'MEMBER', 'ADMIN', 'SYSTEM'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

/** Client platform (BUSINESS_DOMAIN.md §1 `Platform`). */
export const PLATFORMS = ['ANDROID', 'IOS', 'WEB'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Languages of the apps and notifications (BUSINESS_DOMAIN.md §2). */
export const LANGUAGES = ['ar', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const APP_KINDS = ['CUSTOMER', 'MERCHANT'] as const;
export type AppKind = (typeof APP_KINDS)[number];

export const CUSTOMER_STATUSES = ['ACTIVE', 'BLOCKED', 'DELETION_PENDING', 'DELETED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const MEMBER_ROLES = ['OWNER', 'MANAGER', 'EMPLOYEE'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** The 15 per-feature permissions an owner grants (Merchant PRD §6). Owner-only capabilities are never stored. */
export const PERMISSIONS = [
  'DASHBOARD_VIEW',
  'BOOKINGS_VIEW_ALL',
  'BOOKINGS_VIEW_OWN',
  'BOOKINGS_RESPOND',
  'BOOKINGS_OPERATE',
  'SALON_PROFILE_MANAGE',
  'GALLERY_MANAGE',
  'WORKING_HOURS_MANAGE',
  'SERVICES_MANAGE',
  'STAFF_MANAGE',
  'POLICIES_MANAGE',
  'REVIEWS_VIEW',
  'STATISTICS_VIEW',
  'FINANCE_VIEW',
  'SUBSCRIPTION_VIEW',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Who a refresh token belongs to. */
export const SUBJECT_TYPES = ['CUSTOMER', 'MEMBER', 'ADMIN'] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export const REVIEW_TARGETS = ['SALON', 'STAFF'] as const;
export type ReviewTarget = (typeof REVIEW_TARGETS)[number];
export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const STAFF_SELECTIONS = ['SPECIFIC', 'ANY'] as const;
export type StaffSelection = (typeof STAFF_SELECTIONS)[number];

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
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
/** Statuses whose persons occupy their staff member's time (BUSINESS_DOMAIN.md §5.6). */
export const SLOT_HOLDING_STATUSES = [
  'PENDING',
  'APPROVED',
] as const satisfies readonly BookingStatus[];
export const BOOKING_PAYMENT_STATUSES = [
  'PAY_ON_ARRIVAL',
  'DEPOSIT_PAID',
  'FULLY_PAID',
  'PAID',
] as const;
export type BookingPaymentStatus = (typeof BOOKING_PAYMENT_STATUSES)[number];
export const BOOKING_REFUND_STATUSES = [
  'NONE',
  'REFUND_PENDING',
  'REFUNDED',
  'REFUND_FAILED',
] as const;
export type BookingRefundStatus = (typeof BOOKING_REFUND_STATUSES)[number];

/** What a payment attempt pays for (BUSINESS_DOMAIN.md §1 `TransactionType`). */
export const TRANSACTION_TYPES = ['DEPOSIT', 'FULL'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export const TRANSACTION_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
