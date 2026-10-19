import type { NotificationType, Permission } from './enums';
import type { PushPriority } from './providers';

/** Notification core (SRV-093, BUSINESS_DOMAIN.md §3.6 `notifications`, §8). */
export const NOTIFICATIONS_COLLECTION = 'notifications';
export const NOTIFICATION_TITLE_MAX_LENGTH = 200;
export const NOTIFICATION_BODY_MAX_LENGTH = 1000;

/** Outcome stored in `pushResult`. */
export const PUSH_RESULTS = {
  sent: 'SENT',
  noToken: 'NO_TOKEN',
  pushOff: 'PUSH_OFF',
  failed: 'FAILED',
} as const;

/** Who gets an event; the template key is `notifications.<event>.<who>.title|body`. */
export type Audience =
  | { readonly who: 'customer' }
  /** Active members holding ANY of the permissions (the owner has all); `assigned` adds the staff of the booking. */
  | {
      readonly who: 'members';
      readonly permissions: readonly Permission[];
      readonly assigned?: boolean;
    }
  /** Only the staff named for the event (reminders, reassignment). */
  | { readonly who: 'members'; readonly permissions: readonly []; readonly assigned: true }
  | { readonly who: 'owner' };

export interface EventDefinition {
  readonly type: NotificationType;
  readonly audiences: readonly Audience[];
  readonly priority?: PushPriority;
  /** A booking request the merchant must answer: pushed as an overlay / time-sensitive alert (Merchant PRD M10). */
  readonly request?: true;
}

const VIEW_ALL: readonly Permission[] = ['BOOKINGS_VIEW_ALL'];
const RESPOND: readonly Permission[] = ['BOOKINGS_RESPOND'];
const FINANCE: readonly Permission[] = ['FINANCE_VIEW'];
const customer: Audience = { who: 'customer' };
const owner: Audience = { who: 'owner' };

/** The matrix of BUSINESS_DOMAIN.md §8 (admin e-mails are sent by the alerts engine, not here). */
export const NOTIFICATION_EVENTS = {
  'booking.created': { type: 'BOOKING', audiences: [customer] },
  'booking.requested': {
    type: 'BOOKING',
    audiences: [{ who: 'members', permissions: RESPOND }],
    priority: 'HIGH',
    request: true,
  },
  'booking.approved': { type: 'BOOKING', audiences: [customer] },
  'booking.rejected': { type: 'BOOKING', audiences: [customer] },
  'booking.cancelled_by_salon': { type: 'BOOKING', audiences: [customer] },
  'booking.auto_cancelled': {
    type: 'BOOKING',
    audiences: [customer, { who: 'members', permissions: VIEW_ALL, assigned: true }],
  },
  'booking.cancelled_by_customer': {
    type: 'BOOKING',
    audiences: [customer, { who: 'members', permissions: VIEW_ALL, assigned: true }],
  },
  'booking.reminder_1h': {
    type: 'BOOKING',
    audiences: [customer, { who: 'members', permissions: [], assigned: true }],
  },
  'booking.reminder_15m': { type: 'BOOKING', audiences: [customer] },
  'booking.pending_30m': {
    type: 'BOOKING',
    audiences: [customer, { who: 'members', permissions: RESPOND }],
    priority: 'HIGH',
  },
  'booking.completed': { type: 'BOOKING', audiences: [customer] },
  'booking.no_show': { type: 'BOOKING', audiences: [customer] },
  'booking.reassigned': {
    type: 'BOOKING',
    audiences: [customer, { who: 'members', permissions: [], assigned: true }],
  },
  'refund.pending': { type: 'BOOKING', audiences: [customer] },
  'refund.refunded': {
    type: 'BOOKING',
    audiences: [customer, { who: 'members', permissions: FINANCE }],
  },
  'refund.failed': { type: 'SYSTEM', audiences: [{ who: 'members', permissions: FINANCE }] },
  'review.published': {
    type: 'SYSTEM',
    audiences: [{ who: 'members', permissions: ['REVIEWS_VIEW'] }],
  },
  'application.approved': { type: 'SYSTEM', audiences: [owner] },
  'application.rejected': { type: 'SYSTEM', audiences: [owner] },
  'catalog_request.decided': {
    type: 'SYSTEM',
    audiences: [{ who: 'members', permissions: ['SERVICES_MANAGE'] }],
  },
  'payout.transferred': {
    type: 'SYSTEM',
    audiences: [owner, { who: 'members', permissions: FINANCE }],
  },
  // Promotional campaigns choose their recipients themselves (SRV-099), so the matrix has no audience.
  'campaign.promotion': { type: 'PROMOTION', audiences: [] },
  'subscription.ending_7d': { type: 'SYSTEM', audiences: [owner] },
  'subscription.expired': { type: 'SYSTEM', audiences: [owner] },
  'salon.live': { type: 'SYSTEM', audiences: [owner] },
  'salon.not_bookable': { type: 'SYSTEM', audiences: [owner] },
  'salon.offline': { type: 'SYSTEM', audiences: [owner] },
  'salon.online': { type: 'SYSTEM', audiences: [owner] },
  'salon.gender_changed': { type: 'SYSTEM', audiences: [owner] },
  'salon.edited_by_admin': { type: 'SYSTEM', audiences: [owner] },
} as const satisfies Record<string, EventDefinition>;

export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS;

/** Where a tap on a notification goes; the apps map these paths to their screens. */
export const DEEP_LINKS = {
  booking: (id: string): string => `/bookings/${id}`,
  salonSetup: '/salon',
  finance: '/finance',
  subscription: '/subscription',
  services: '/services',
  reviews: '/reviews',
} as const;

/** Booking status → the event customers and salons are told about. */
export const EVENT_BY_BOOKING_STATUS = {
  APPROVED: 'booking.approved',
  REJECTED: 'booking.rejected',
  CANCELLED_BY_SALON: 'booking.cancelled_by_salon',
  AUTO_CANCELLED: 'booking.auto_cancelled',
  CANCELLED_BY_CUSTOMER: 'booking.cancelled_by_customer',
  COMPLETED: 'booking.completed',
  NO_SHOW: 'booking.no_show',
} as const satisfies Partial<Record<string, NotificationEvent>>;

/** In-app inbox (SRV-094, Customer PRD S19, Merchant PRD M24). */
export const NOTIFICATION_ROUTES = {
  base: '/notifications',
  read: '/read',
  unreadCount: '/unread-count',
} as const;
/** Most ids one "mark as read" call may carry (a screen shows a page of 10, with room for scrolling). */
export const MAX_READ_IDS = 50;
export const INBOX_SEARCH_MAX_LENGTH = 100;

/** How the merchant apps present a booking request outside the app (Merchant PRD M10). */
export const REQUEST_PUSH = {
  androidChannelId: 'booking_requests',
  iosActionCategory: 'BOOKING_REQUEST',
  sound: 'booking_request',
  /** The buttons the apps show: Accept runs in the background, Reject opens the reason picker. */
  actions: 'ACCEPT,REJECT,OPEN',
} as const;
