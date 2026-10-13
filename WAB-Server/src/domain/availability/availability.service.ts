import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { MS_PER_MINUTE } from '../../constants/time';
import type { MemberRaw } from '../../models/member.model';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { LeavesRepository } from '../../repositories/leaves.repository';
import type { ClosuresRepository } from '../../repositories/closures.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { Entity } from '../../utils/database/plain';
import { NotFoundError, ValidationError, type ErrorDetail } from '../../utils/errors';
import { localDayRange } from '../../utils/time';
import type { SettingsService } from '../settings';
import {
  computeAvailability,
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

export const createAvailabilityService = (deps: AvailabilityDeps): AvailabilityService => {
  const { salons, members, salonServices, closures, leaves, holds, settings } = deps;
  const bookings = deps.bookings ?? noBookingBusy;
  const now = deps.now ?? ((): Date => new Date());

  return {
    async slots({ salonId, date, person, others = [], draftId }) {
      const salon = await salons.findById(salonId);
      if (salon?.state !== 'LIVE' || !salon.completeness.isComplete) {
        throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      }
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

      const [timeZone, slotMinutes, maxDaysAhead, minLeadMinutes] = await Promise.all([
        settings.get('timezone'),
        settings.get('booking.slotMinutes'),
        settings.get('booking.maxDaysAhead'),
        settings.get('booking.minLeadMinutes'),
      ]);
      const at = now();
      const range = localDayRange(date, timeZone);
      const [ranges, onLeave, booked, held] = await Promise.all([
        closures.findMany({ salonId, from: { $lte: date }, to: { $gte: date } }),
        leaves.findMany({ salonId, from: { $lte: date }, to: { $gte: date } }),
        bookings.busy({ salonId, from: range.start, to: range.end }),
        holds.busy({
          staffIds: team.map((m) => m.id),
          date,
          nowMs: at.getTime(),
          exceptDraftId: draftId,
        }),
      ]);

      const result = computeAvailability({
        date,
        now: at,
        timeZone,
        slotMinutes,
        maxDaysAhead,
        minLeadMinutes,
        schedule: salon.weeklySchedule,
        closures: ranges,
        staff: team.map(toStaff),
        leaves: onLeave.map((l) => ({ staffId: l.memberId, from: l.from, to: l.to })),
        busy: [...booked, ...held, ...others],
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
  };
};
