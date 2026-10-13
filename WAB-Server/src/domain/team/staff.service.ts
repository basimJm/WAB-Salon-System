import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { DayOfWeek } from '../../constants/time';
import type { MemberRaw } from '../../models/member.model';
import type { SalonRaw } from '../../models/salon.model';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from '../../utils/errors';
import { parseHHmm } from '../../utils/time';
import type { SettingsService } from '../settings';
import type { SalonStateService } from '../salons/salonState.service';
import type { BookingConflict } from '../salons/hoursService';

export interface WorkingDayInput {
  readonly day: DayOfWeek;
  /** Custom hours within the salon's hours; both or neither. */
  readonly start?: string | undefined;
  readonly end?: string | undefined;
}

export interface StaffProfileInput {
  /** `false` takes the member off the public staff list but keeps ratings and history. */
  readonly providesServices: boolean;
  readonly bio?: string | undefined;
  readonly yearsOfExperience?: number | undefined;
  /** Ids of the salon's services the member can perform. */
  readonly serviceIds: readonly string[];
  readonly brideQualified: boolean;
  readonly workingDays: readonly WorkingDayInput[];
}

export interface StaffProfileView {
  readonly memberId: string;
  readonly providesServices: boolean;
  readonly bio: string | null;
  readonly yearsOfExperience: number | null;
  readonly serviceIds: string[];
  readonly brideQualified: boolean;
  readonly workingDays: { day: DayOfWeek; start: string | null; end: string | null }[];
  readonly rating: { avg: number; count: number };
  readonly customersCount: number;
}

/** Upcoming bookings a staff change would break (BUSINESS_DOMAIN.md §5.12); none until bookings exist. */
export interface StaffConflicts {
  check(input: {
    salonId: string;
    memberId: string;
    before: Entity<MemberRaw>;
    after: StaffProfileInput;
  }): Promise<BookingConflict[]>;
}

export const noStaffConflicts: StaffConflicts = { check: () => Promise.resolve([]) };

export interface StaffService {
  get(input: { salonId: string; memberId: string }): Promise<StaffProfileView>;
  set(input: {
    salonId: string;
    memberId: string;
    profile: StaffProfileInput;
  }): Promise<StaffProfileView>;
}

export interface StaffDeps {
  readonly members: MembersRepository;
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly salonServices: Pick<SalonServicesRepository, 'findMany'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly state: Pick<SalonStateService, 'recompute'>;
  readonly conflicts?: StaffConflicts;
}

const invalid = (fields: readonly string[]): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: fields.map((field): ErrorDetail => ({
      field,
      code: ERROR_CODES.VALIDATION_ERROR,
      messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
    })),
  });

const EMPTY_RATING = { avg: 0, count: 0 };

export const createStaffService = (deps: StaffDeps): StaffService => {
  const { members, salons, salonServices, settings, state } = deps;
  const conflicts = deps.conflicts ?? noStaffConflicts;

  const view = (m: Entity<MemberRaw>): StaffProfileView => ({
    memberId: m.id,
    providesServices: m.providesServices,
    bio: m.staff?.bio ?? null,
    yearsOfExperience: m.staff?.yearsOfExperience ?? null,
    serviceIds: m.staff?.serviceIds ?? [],
    brideQualified: m.staff?.brideQualified ?? false,
    workingDays: (m.staff?.workingDays ?? []).map((d) => ({
      day: d.day,
      start: d.start ?? null,
      end: d.end ?? null,
    })),
    rating: m.staff?.rating ?? EMPTY_RATING,
    customersCount: m.staff?.customersCount ?? 0,
  });

  const findMember = async (salonId: string, memberId: string): Promise<Entity<MemberRaw>> => {
    const member = await members.findOne({ _id: memberId, salonId });
    if (member === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return member;
  };

  /** Skills must be services of this salon; days must be open days; custom hours stay inside the salon's. */
  const validate = async (salon: Entity<SalonRaw>, profile: StaffProfileInput): Promise<void> => {
    const bad: string[] = [];
    if (profile.brideQualified && salon.gender !== 'FEMALE') bad.push('body.brideQualified');
    const wanted = [...new Set(profile.serviceIds)];
    if (wanted.length !== profile.serviceIds.length) bad.push('body.serviceIds');
    if (wanted.length > 0) {
      const own = await salonServices.findMany({ salonId: salon.id, _id: { $in: wanted } });
      if (own.length !== wanted.length) bad.push('body.serviceIds');
    }
    const step = await settings.get('booking.slotMinutes');
    const seen = new Set<DayOfWeek>();
    profile.workingDays.forEach((entry, index) => {
      const at = `body.workingDays.${String(index)}`;
      const open = salon.weeklySchedule.find((d) => d.day === entry.day && !d.isOff);
      if (seen.has(entry.day)) bad.push(`${at}.day`);
      seen.add(entry.day);
      if (open === undefined) {
        bad.push(`${at}.day`);
        return;
      }
      if ((entry.start === undefined) !== (entry.end === undefined)) {
        bad.push(`${at}.start`);
        return;
      }
      if (entry.start === undefined || entry.end === undefined) return;
      const start = parseHHmm(entry.start);
      const end = parseHHmm(entry.end);
      if (end <= start) bad.push(`${at}.end`);
      if (start < parseHHmm(open.open)) bad.push(`${at}.start`);
      if (end > parseHHmm(open.close)) bad.push(`${at}.end`);
      if (start % step !== 0) bad.push(`${at}.start`);
      if (end % step !== 0) bad.push(`${at}.end`);
    });
    if (bad.length > 0) throw invalid([...new Set(bad)]);
  };

  return {
    async get({ salonId, memberId }) {
      return view(await findMember(salonId, memberId));
    },

    async set({ salonId, memberId, profile }) {
      const member = await findMember(salonId, memberId);
      const salon = await salons.findById(salonId);
      if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      await validate(salon, profile);

      const found = await conflicts.check({ salonId, memberId, before: member, after: profile });
      if (found.length > 0) {
        throw new ConflictError({
          code: ERROR_CODES.SCHEDULE_CONFLICT,
          details: found.map((c): ErrorDetail => ({
            field: c.bookingId,
            code: ERROR_CODES.SCHEDULE_CONFLICT,
            messageKey: errorMessageKey(ERROR_CODES.SCHEDULE_CONFLICT),
          })),
        });
      }
      const previous = member.staff;
      const updated = await members.patch(memberId, {
        set: {
          providesServices: profile.providesServices,
          staff: {
            ...(profile.bio === undefined ? {} : { bio: profile.bio }),
            ...(profile.yearsOfExperience === undefined
              ? {}
              : { yearsOfExperience: profile.yearsOfExperience }),
            serviceIds: profile.serviceIds.map(toObjectId),
            brideQualified: profile.brideQualified,
            workingDays: profile.workingDays.map((d) => ({
              day: d.day,
              ...(d.start === undefined ? {} : { start: d.start, end: d.end }),
            })),
            // Reviews and visits belong to the person: they survive switching the profile off.
            rating: previous?.rating ?? EMPTY_RATING,
            customersCount: previous?.customersCount ?? 0,
          },
        },
      });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      await state.recompute(salonId);
      return view(updated);
    },
  };
};
