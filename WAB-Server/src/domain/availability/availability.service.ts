import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { MS_PER_MINUTE } from '../../constants/time';
import type { MemberRaw } from '../../models/member.model';
import type { SalonRaw } from '../../models/salon.model';
import type { SalonServiceRaw } from '../../models/salonService.model';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { LeavesRepository } from '../../repositories/leaves.repository';
import type { ClosuresRepository } from '../../repositories/closures.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { Entity } from '../../utils/database/plain';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from '../../utils/errors';
import { localDateOf, localDayRange } from '../../utils/time';
import type { SettingsService } from '../settings';
import {
  computeAvailability,
  pickAnyStaff,
  type AvailabilityPerson,
  type AvailabilityResult,
  type AvailabilityStaff,
  type BusyInterval,
  type UnavailableReason,
} from './availability';
import type { HoldsStore } from './holds';

/** Where existing PENDING/APPROVED bookings come from; the booking module supplies it (SRV-071). */
export interface BookingBusyLookup {
  busy(input: { salonId: string; from: Date; to: Date }): Promise<BusyInterval[]>;
}
export const noBookingBusy: BookingBusyLookup = { busy: () => Promise.resolve([]) };

export interface AvailabilityRequest {
  readonly salonId: string;
  readonly date: string;
  readonly person: {
    /** Salon service ids (`services[].id` of the salon details). */
    readonly serviceIds: readonly string[];
    readonly isBride: boolean;
    readonly staffId?: string | undefined;
  };
  /** Times the other persons of the same draft already picked: treated as occupied. */
  readonly others?: readonly BusyInterval[] | undefined;
  /** The caller's own draft: its holds must not block it. */
  readonly draftId?: string | undefined;
}

export interface AvailabilityResponse {
  readonly date: string;
  readonly reason: UnavailableReason | null;
  readonly durationMinutes: number;
  readonly slots: { start: Date; end: Date; available: boolean; eligibleStaffIds: string[] }[];
}

export interface AvailabilityService {
  slots(input: AvailabilityRequest): Promise<AvailabilityResponse>;
  /**
   * Checks a whole booking person by person (each pick blocks the next person) and assigns staff
   * ("any available" -> least busy). Failures carry the domain error codes of BUSINESS_DOMAIN §11.
   */
  plan(input: {
    salonId: string;
    persons: readonly PlanPersonInput[];
    draftId?: string | undefined;
    /** For a booking that already exists (reassignment): the booking lead time no longer applies. */
    ignoreLeadTime?: boolean;
  }): Promise<BookingPlan>;
}

export interface AvailabilityDeps {
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly members: Pick<MembersRepository, 'findMany'>;
  readonly salonServices: Pick<SalonServicesRepository, 'findMany'>;
  readonly closures: Pick<ClosuresRepository, 'findMany'>;
  readonly leaves: Pick<LeavesRepository, 'findMany'>;
  readonly bookings?: BookingBusyLookup;
  readonly holds: Pick<HoldsStore, 'busy'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly now?: () => Date;
}

const invalid = (
  field: string,
  code: typeof ERROR_CODES.VALIDATION_ERROR = ERROR_CODES.VALIDATION_ERROR,
): ValidationError =>
  new ValidationError({
    code,
    details: [{ field, code, messageKey: errorMessageKey(code) } satisfies ErrorDetail],
  });

const toStaff = (m: Entity<MemberRaw>): AvailabilityStaff => ({
  id: m.id,
  active: m.active,
  providesServices: m.providesServices,
  serviceIds: m.staff?.serviceIds ?? [],
  brideQualified: m.staff?.brideQualified ?? false,
  workingDays: m.staff?.workingDays ?? [],
});

/** One person as the booking draft submits them. */
export interface PlanPersonInput {
  readonly name: string;
  readonly isBride: boolean;
  readonly serviceIds: readonly string[];
  /** Omitted = "any available staff". */
  readonly staffId?: string | undefined;
  readonly start: Date;
}

export interface PlannedPerson {
  readonly name: string;
  readonly isBride: boolean;
  readonly services: readonly Entity<SalonServiceRaw>[];
  readonly durationMinutes: number;
  readonly staffId: string;
  readonly staffSelection: 'SPECIFIC' | 'ANY';
  readonly start: Date;
  readonly end: Date;
}

export interface BookingPlan {
  readonly salon: Entity<SalonRaw>;
  readonly persons: readonly PlannedPerson[];
}

const rule = (code: keyof typeof ERROR_CODES, field?: string): BusinessRuleError =>
  new BusinessRuleError({
    code: ERROR_CODES[code],
    ...(field === undefined
      ? {}
      : {
          details: [
            { field, code: ERROR_CODES[code], messageKey: errorMessageKey(ERROR_CODES[code]) },
          ],
        }),
  });

export const createAvailabilityService = (deps: AvailabilityDeps): AvailabilityService => {
  const { salons, members, salonServices, closures, leaves, holds, settings } = deps;
  const bookings = deps.bookings ?? noBookingBusy;
  const now = deps.now ?? ((): Date => new Date());

  const visibleSalon = async (salonId: string): Promise<Entity<SalonRaw> | null> => {
    const salon = await salons.findById(salonId);
    return salon?.state === 'LIVE' && salon.completeness.isComplete ? salon : null;
  };

  /** Loads what a day needs and runs the pure core for one person. */
  const computeDay = async (input: {
    salon: Entity<SalonRaw>;
    team: readonly Entity<MemberRaw>[];
    date: string;
    person: AvailabilityPerson;
    others: readonly BusyInterval[];
    draftId: string | undefined;
    ignoreLeadTime?: boolean;
  }): Promise<{ result: AvailabilityResult; bookedCounts: Map<string, number> }> => {
    const { salon, team, date, person, others, draftId, ignoreLeadTime } = input;
    const [timeZone, slotMinutes, maxDaysAhead, minLeadMinutes] = await Promise.all([
      settings.get('timezone'),
      settings.get('booking.slotMinutes'),
      settings.get('booking.maxDaysAhead'),
      settings.get('booking.minLeadMinutes'),
    ]);
    const at = now();
    const range = localDayRange(date, timeZone);
    const [ranges, onLeave, booked, held] = await Promise.all([
      closures.findMany({ salonId: salon.id, from: { $lte: date }, to: { $gte: date } }),
      leaves.findMany({ salonId: salon.id, from: { $lte: date }, to: { $gte: date } }),
      bookings.busy({ salonId: salon.id, from: range.start, to: range.end }),
      holds.busy({
        staffIds: team.map((m) => m.id),
        date,
        nowMs: at.getTime(),
        exceptDraftId: draftId,
      }),
    ]);
    const bookedCounts = new Map<string, number>();
    for (const interval of booked) {
      bookedCounts.set(interval.staffId, (bookedCounts.get(interval.staffId) ?? 0) + 1);
    }
    const result = computeAvailability({
      date,
      now: at,
      timeZone,
      slotMinutes,
      maxDaysAhead,
      minLeadMinutes: ignoreLeadTime === true ? 0 : minLeadMinutes,
      schedule: salon.weeklySchedule,
      closures: ranges,
      staff: team.map(toStaff),
      leaves: onLeave.map((l) => ({ staffId: l.memberId, from: l.from, to: l.to })),
      busy: [...booked, ...held, ...others],
      person,
    });
    return { result, bookedCounts };
  };

  return {
    async slots({ salonId, date, person, others = [], draftId }) {
      const salon = await visibleSalon(salonId);
      if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      if (person.isBride && salon.gender !== 'FEMALE') throw invalid('body.person.isBride');

      const wanted = [...new Set(person.serviceIds)];
      if (wanted.length !== person.serviceIds.length) throw invalid('body.person.serviceIds');
      const chosen = await salonServices.findMany({
        salonId,
        active: true,
        _id: { $in: wanted },
      });
      if (chosen.length !== wanted.length) throw invalid('body.person.serviceIds');
      const durationMinutes = chosen.reduce((total, s) => total + s.durationMinutes, 0);

      const team = await members.findMany({ salonId, active: true, providesServices: true });
      if (person.staffId !== undefined && !team.some((m) => m.id === person.staffId)) {
        throw invalid('body.person.staffId');
      }
      for (const [index, pick] of others.entries()) {
        if (!team.some((m) => m.id === pick.staffId)) {
          throw invalid(`body.others.${String(index)}.staffId`);
        }
      }

      const { result } = await computeDay({
        salon,
        team,
        date,
        others,
        draftId,
        person: {
          serviceIds: wanted,
          durationMinutes,
          isBride: person.isBride,
          hasBrideOnlyService: chosen.some((s) => s.brideOnly),
          staffId: person.staffId,
        },
      });
      return {
        date: result.date,
        reason: result.reason,
        durationMinutes,
        slots: result.slots.map((s) => ({
          start: s.start,
          end: new Date(s.start.getTime() + durationMinutes * MS_PER_MINUTE),
          available: s.available,
          eligibleStaffIds: [...s.eligibleStaffIds],
        })),
      };
    },

    async plan({ salonId, persons, draftId, ignoreLeadTime }) {
      const salon = await visibleSalon(salonId);
      if (salon === null) throw rule('SALON_NOT_BOOKABLE');
      const maxCompanions = await settings.get('booking.maxCompanions');
      if (persons.length > maxCompanions + 1) throw rule('TOO_MANY_COMPANIONS', 'persons');
      const timeZone = await settings.get('timezone');
      const team = await members.findMany({ salonId, active: true, providesServices: true });

      const picks: BusyInterval[] = [];
      const planned: PlannedPerson[] = [];
      for (const [index, input] of persons.entries()) {
        const at = (key: string): string => `persons.${String(index)}.${key}`;
        if (input.isBride && salon.gender !== 'FEMALE')
          throw rule('GENDER_MISMATCH', at('isBride'));
        const wanted = [...new Set(input.serviceIds)];
        const chosen =
          wanted.length === 0 || wanted.length !== input.serviceIds.length
            ? []
            : await salonServices.findMany({ salonId, active: true, _id: { $in: wanted } });
        if (chosen.length === 0 || chosen.length !== wanted.length) {
          throw rule('SERVICE_UNAVAILABLE', at('serviceIds'));
        }
        if (!input.isBride && chosen.some((s) => s.brideOnly)) {
          throw rule('BRIDE_ONLY_SERVICE', at('serviceIds'));
        }
        if (input.staffId !== undefined && !team.some((m) => m.id === input.staffId)) {
          throw rule('STAFF_NOT_ELIGIBLE', at('staffId'));
        }
        const durationMinutes = chosen.reduce((total, s) => total + s.durationMinutes, 0);
        const date = localDateOf(input.start, timeZone);
        const { result, bookedCounts } = await computeDay({
          salon,
          team,
          date,
          others: picks,
          draftId,
          ...(ignoreLeadTime === undefined ? {} : { ignoreLeadTime }),
          person: {
            serviceIds: wanted,
            durationMinutes,
            isBride: input.isBride,
            hasBrideOnlyService: chosen.some((s) => s.brideOnly),
            staffId: input.staffId,
          },
        });
        if (result.reason === 'CLOSED') throw rule('SALON_CLOSED', at('start'));
        if (result.reason !== null) throw rule('DATE_OUT_OF_RANGE', at('start'));
        const slot = result.slots.find((s) => s.start.getTime() === input.start.getTime());
        if (slot?.available !== true) throw rule('SLOT_UNAVAILABLE', at('start'));
        const staffId = pickAnyStaff(slot.eligibleStaffIds, bookedCounts);
        if (staffId === null) throw rule('SLOT_UNAVAILABLE', at('start'));
        const end = new Date(input.start.getTime() + durationMinutes * MS_PER_MINUTE);
        picks.push({ staffId, start: input.start, end });
        planned.push({
          name: input.name,
          isBride: input.isBride,
          services: chosen,
          durationMinutes,
          staffId,
          staffSelection: input.staffId === undefined ? 'ANY' : 'SPECIFIC',
          start: input.start,
          end,
        });
      }
      return { salon, persons: planned };
    },
  };
};
