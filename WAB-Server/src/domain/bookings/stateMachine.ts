import type { ActorType, BookingStatus } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import { MS_PER_HOUR } from '../../constants/time';
import { BusinessRuleError, ForbiddenError } from '../../utils/errors';

/** The permission a member needs for a transition (BUSINESS_DOMAIN.md §5.7). */
export type TransitionPermission = 'BOOKINGS_RESPOND' | 'BOOKINGS_OPERATE';

export interface Actor {
  readonly type: ActorType;
  readonly id?: string | undefined;
  /** Permissions of a MEMBER (owners carry all). */
  readonly permissions?: readonly string[] | undefined;
  /** A MEMBER who is the staff of one of the booking's persons (§5.21). */
  readonly assigned?: boolean | undefined;
}

export interface BookingFacts {
  readonly status: BookingStatus;
  readonly appointmentStart: Date;
  readonly respondBy: Date;
  readonly cancellationWindowHours: number;
}

interface Rule {
  readonly from: BookingStatus;
  readonly to: BookingStatus;
  readonly actors: readonly ActorType[];
  readonly permission?: TransitionPermission;
  /** The booking's own staff may do it without the permission (§5.21: close their booking). */
  readonly assignedMay?: boolean;
  readonly reasonRequired?: boolean;
  /** Extra precondition on the clock; throws a domain error when it does not hold. */
  readonly check?: (facts: BookingFacts, now: Date) => void;
}

const afterStart = (facts: BookingFacts, now: Date): void => {
  if (now < facts.appointmentStart)
    throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
};
const beforeStart = (facts: BookingFacts, now: Date): void => {
  if (now >= facts.appointmentStart)
    throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
};
const insideWindow = (facts: BookingFacts, now: Date): void => {
  const deadline = facts.appointmentStart.getTime() - facts.cancellationWindowHours * MS_PER_HOUR;
  if (now.getTime() >= deadline) {
    throw new BusinessRuleError({ code: ERROR_CODES.CANCELLATION_WINDOW_PASSED });
  }
};
const pastRespondBy = (facts: BookingFacts, now: Date): void => {
  if (now < facts.respondBy) throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
};

/** The transition table of §5.7. ADMIN may additionally move any booking (see `ADMIN_ANY`). */
export const TRANSITIONS: readonly Rule[] = [
  { from: 'PENDING', to: 'APPROVED', actors: ['MEMBER'], permission: 'BOOKINGS_RESPOND' },
  {
    from: 'PENDING',
    to: 'REJECTED',
    actors: ['MEMBER'],
    permission: 'BOOKINGS_RESPOND',
    reasonRequired: true,
  },
  { from: 'PENDING', to: 'CANCELLED_BY_CUSTOMER', actors: ['CUSTOMER'] },
  { from: 'PENDING', to: 'AUTO_CANCELLED', actors: ['SYSTEM'], check: pastRespondBy },
  { from: 'APPROVED', to: 'CANCELLED_BY_CUSTOMER', actors: ['CUSTOMER'], check: insideWindow },
  {
    from: 'APPROVED',
    to: 'CANCELLED_BY_SALON',
    actors: ['MEMBER'],
    permission: 'BOOKINGS_OPERATE',
    reasonRequired: true,
    check: beforeStart,
  },
  {
    from: 'APPROVED',
    to: 'COMPLETED',
    actors: ['MEMBER'],
    permission: 'BOOKINGS_OPERATE',
    assignedMay: true,
    check: afterStart,
  },
  {
    from: 'APPROVED',
    to: 'NO_SHOW',
    actors: ['MEMBER'],
    permission: 'BOOKINGS_OPERATE',
    assignedMay: true,
    check: afterStart,
  },
];

export const FINAL_STATUSES: readonly BookingStatus[] = [
  'REJECTED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SALON',
  'AUTO_CANCELLED',
  'COMPLETED',
  'NO_SHOW',
];

export interface HistoryEntry {
  readonly status: BookingStatus;
  readonly actorType: ActorType;
  readonly actorId?: string | undefined;
  readonly reason?: string | undefined;
  readonly at: Date;
}

/**
 * Checks one transition and returns the history entry to append. A booking that already left the
 * wanted state is `ALREADY_HANDLED`; anything the table does not allow is `INVALID_TRANSITION`.
 * ADMIN may do any change away from a non-identical status with a mandatory reason.
 */
export const applyTransition = (input: {
  facts: BookingFacts;
  to: BookingStatus;
  actor: Actor;
  reason?: string | undefined;
  now: Date;
}): HistoryEntry => {
  const { facts, to, actor, now } = input;
  const reason = input.reason?.trim() === '' ? undefined : input.reason?.trim();
  if (facts.status === to) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });

  if (actor.type === 'ADMIN') {
    if (reason === undefined) throw new BusinessRuleError({ code: ERROR_CODES.VALIDATION_ERROR });
    return { status: to, actorType: 'ADMIN', actorId: actor.id, reason, at: now };
  }

  const rule = TRANSITIONS.find((r) => r.from === facts.status && r.to === to);
  if (rule === undefined) {
    // Someone else already decided it: the caller wanted a decision that no longer exists.
    const decided = FINAL_STATUSES.includes(facts.status) || facts.status === 'APPROVED';
    throw new BusinessRuleError({
      code:
        decided && facts.status !== 'APPROVED'
          ? ERROR_CODES.ALREADY_HANDLED
          : ERROR_CODES.INVALID_TRANSITION,
    });
  }
  if (!rule.actors.includes(actor.type))
    throw new ForbiddenError({ code: ERROR_CODES.PERMISSION_DENIED });
  if (
    rule.permission !== undefined &&
    actor.type === 'MEMBER' &&
    !(actor.permissions ?? []).includes(rule.permission) &&
    !(rule.assignedMay === true && actor.assigned === true)
  ) {
    throw new ForbiddenError({ code: ERROR_CODES.PERMISSION_DENIED });
  }
  if (rule.reasonRequired === true && reason === undefined) {
    throw new BusinessRuleError({ code: ERROR_CODES.VALIDATION_ERROR });
  }
  rule.check?.(facts, now);
  return { status: to, actorType: actor.type, actorId: actor.id, reason, at: now };
};

/** Statuses a booking can still move to (for the UI), ignoring the clock. */
export const nextStatuses = (status: BookingStatus): BookingStatus[] =>
  TRANSITIONS.filter((r) => r.from === status).map((r) => r.to);
