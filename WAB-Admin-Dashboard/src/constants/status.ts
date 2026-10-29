import type { ToneName } from '@/design/tokens/colors';

/**
 * The single source of badge tones for every status enum of BUSINESS_DOMAIN §2 that the admin shows.
 * Labels live in the locale files under `status.<kind>.<VALUE>`. A new enum value = one line here + two labels
 * (tests/status.test.ts fails otherwise); no page decides a tone itself.
 */
export const STATUS_TONES = {
  branch: { ACTIVE: 'green', OFFLINE: 'amber', CLOSED: 'grey' },
  booking: {
    PENDING: 'amber',
    APPROVED: 'green',
    REJECTED: 'rose',
    CANCELLED_BY_CUSTOMER: 'grey',
    CANCELLED_BY_SALON: 'grey',
    AUTO_CANCELLED: 'grey',
    COMPLETED: 'purple',
    NO_SHOW: 'rose',
  },
  payment: {
    PAY_ON_ARRIVAL: 'grey',
    DEPOSIT_PAID: 'violet',
    FULLY_PAID: 'green',
    PAID: 'green',
  },
  refund: {
    NONE: 'grey',
    REFUND_PENDING: 'amber',
    REFUNDED: 'green',
    REFUND_FAILED: 'rose',
  },
  transaction: {
    PENDING: 'amber',
    SUCCEEDED: 'green',
    FAILED: 'rose',
    CANCELLED: 'grey',
  },
  review: {
    PENDING: 'amber',
    APPROVED: 'green',
    REJECTED: 'rose',
    REMOVED: 'grey',
  },
  customer: {
    ACTIVE: 'green',
    BLOCKED: 'rose',
    DELETION_PENDING: 'amber',
    DELETED: 'grey',
  },
  salon: {
    APPLICATION_PENDING: 'amber',
    APPLICATION_REJECTED: 'rose',
    APPROVED_INCOMPLETE: 'violet',
    LIVE: 'green',
    OFFLINE: 'grey',
  },
  subscription: {
    TRIAL: 'violet',
    ACTIVE: 'green',
    EXPIRED: 'rose',
  },
  payout: {
    PENDING: 'amber',
    TRANSFERRED: 'green',
  },
  catalogRequest: {
    PENDING: 'amber',
    APPROVED: 'green',
    REJECTED: 'rose',
  },
  campaign: {
    SCHEDULED: 'violet',
    SENDING: 'amber',
    SENT: 'green',
    CANCELLED: 'grey',
  },
  placement: {
    SCHEDULED: 'violet',
    ACTIVE: 'green',
    ENDED: 'grey',
  },
  // Design kit `W.S.alert` / `W.S.sev`: new = rose, info = purple.
  alert: {
    NEW: 'rose',
    ACKNOWLEDGED: 'grey',
  },
  alertSeverity: {
    INFO: 'purple',
    WARNING: 'amber',
    CRITICAL: 'rose',
  },
  // BUSINESS_DOMAIN §5.19: what a business is and who it serves (type + audience badges on rows and details).
  businessType: { SALON: 'violet', CLINIC: 'purple' },
  audience: { FEMALE: 'rose', MALE: 'grey', BOTH: 'green' },
  export: {
    QUEUED: 'grey',
    RUNNING: 'amber',
    DONE: 'green',
    FAILED: 'rose',
  },
} as const satisfies Record<string, Record<string, ToneName>>;

export type StatusTone = ToneName;
export type StatusKind = keyof typeof STATUS_TONES;
export const STATUS_KINDS = Object.keys(STATUS_TONES) as StatusKind[];
/** Tone used for a value the registry does not know yet (the server added one): visible, never a crash. */
export const UNKNOWN_STATUS_TONE: ToneName = 'grey';
export const STATUS_LABEL_PREFIX = 'status';
