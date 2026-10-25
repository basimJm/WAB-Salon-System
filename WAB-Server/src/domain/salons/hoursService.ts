import type { MainBranches } from '../branches/mainBranch';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { SCHEDULE_DAY_ORDER } from '../../constants/salon';
import type { DayOfWeek } from '../../constants/time';
import type { SalonClosureRaw } from '../../models/salonClosure.model';
import type { ScheduleDay } from '../../models/salon.model';
import type { ClosuresRepository } from '../../repositories/closures.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from '../../utils/errors';
import { localDateOf, parseHHmm } from '../../utils/time';
import type { SettingsService } from '../settings';
import { todaysHours, type TodaysHours } from './hours';
import type { SalonStateService } from './salonState.service';

export interface BookingConflict {
  readonly bookingId: string;
  readonly startsAt: Date;
  readonly status: string;
}

/**
 * Upcoming PENDING/APPROVED bookings a schedule or closure change would break (BUSINESS_DOMAIN.md
 * §5.12). Bookings do not exist yet (SRV-070+), so the default finds none.
 */
export interface ScheduleConflicts {
  weekly(salonId: string, days: readonly ScheduleDay[]): Promise<BookingConflict[]>;
  closure(salonId: string, range: { from: string; to: string }): Promise<BookingConflict[]>;
}

export const noScheduleConflicts: ScheduleConflicts = {
  weekly: () => Promise.resolve([]),
  closure: () => Promise.resolve([]),
};

export interface ClosureView {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly reason: string;
  /** Only closures that start after today can still be changed or removed. */
  readonly editable: boolean;
}

export interface HoursView {
  readonly weeklySchedule: ScheduleDay[];
  readonly closures: ClosureView[];
  readonly today: TodaysHours;
}

export interface WeeklyDayInput {
  readonly day: DayOfWeek;
  readonly isOff: boolean;
  readonly open: string;
  readonly close: string;
}

export interface HoursService {
  get(salonId: string): Promise<HoursView>;
  setWeekly(salonId: string, days: readonly WeeklyDayInput[]): Promise<HoursView>;
  addClosure(input: {
    salonId: string;
    from: string;
    to: string;
    reason: string;
  }): Promise<ClosureView>;
  updateClosure(input: {
    salonId: string;
    id: string;
    from?: string | undefined;
    to?: string | undefined;
    reason?: string | undefined;
  }): Promise<ClosureView>;
  removeClosure(input: { salonId: string; id: string }): Promise<void>;
}

export interface HoursDeps {
  readonly salons: Pick<SalonsRepository, 'findById' | 'patch'>;
  readonly closures: ClosuresRepository;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly state: Pick<SalonStateService, 'recompute'>;
  readonly conflicts?: ScheduleConflicts;
  readonly now?: () => Date;
  /** Salon-level endpoint: hours are copied to, and closures land on, the main branch (§5.16). */
  readonly mainBranches?: Pick<MainBranches, 'idOf' | 'mirror'>;
}

const invalid = (...fields: string[]): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: fields.map((field): ErrorDetail => ({
      field,
      code: ERROR_CODES.VALIDATION_ERROR,
      messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
    })),
  });

export const createHoursService = (deps: HoursDeps): HoursService => {
  const { salons, closures, settings, state } = deps;
  const conflicts = deps.conflicts ?? noScheduleConflicts;
  const now = deps.now ?? ((): Date => new Date());

  const today = async (): Promise<string> => localDateOf(now(), await settings.get('timezone'));

  const loadSalon = async (salonId: string): Promise<Entity<{ weeklySchedule: ScheduleDay[] }>> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon;
  };

  const toClosure = (c: Entity<SalonClosureRaw>, date: string): ClosureView => ({
    id: c.id,
    from: c.from,
    to: c.to,
    reason: c.reason,
    editable: c.from > date,
  });

  /** Existing bookings that the change would break stop it with the list (SCHEDULE_CONFLICT). */
  const rejectConflicts = (found: readonly BookingConflict[]): void => {
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
  };

  const view = async (salonId: string): Promise<HoursView> => {
    const [salon, date, timeZone] = await Promise.all([
      loadSalon(salonId),
      today(),
      settings.get('timezone'),
    ]);
    const all = await closures.forSalon(salonId);
    return {
      weeklySchedule: salon.weeklySchedule,
      closures: all.filter((c) => c.to >= date).map((c) => toClosure(c, date)),
      today: todaysHours(salon.weeklySchedule, all, now(), timeZone),
    };
  };

  const checkRange = (from: string, to: string, date: string): void => {
    if (to < from) throw invalid('body.to');
    if (from < date) throw invalid('body.from');
  };

  return {
    get: view,

    async setWeekly(salonId, input) {
      const step = await settings.get('booking.slotMinutes');
      const present = new Set(input.map((d) => d.day));
      if (
        input.length !== SCHEDULE_DAY_ORDER.length ||
        present.size !== SCHEDULE_DAY_ORDER.length
      ) {
        throw invalid('body.days');
      }
      const bad: string[] = [];
      input.forEach((entry, index) => {
        const open = parseHHmm(entry.open);
        const close = parseHHmm(entry.close);
        if (entry.isOff) return;
        if (close <= open) bad.push(`body.days.${String(index)}.close`);
        if (open % step !== 0) bad.push(`body.days.${String(index)}.open`);
        if (close % step !== 0) bad.push(`body.days.${String(index)}.close`);
      });
      if (bad.length > 0) throw invalid(...new Set(bad));

      const week: ScheduleDay[] = SCHEDULE_DAY_ORDER.flatMap((day) => {
        const entry = input.find((d) => d.day === day);
        return entry === undefined
          ? []
          : [{ day, isOff: entry.isOff, open: entry.open, close: entry.close }];
      });
      rejectConflicts(await conflicts.weekly(salonId, week));
      const updated = await salons.patch(salonId, { set: { weeklySchedule: week } });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      await deps.mainBranches?.mirror(salonId, { weeklySchedule: week });
      await state.recompute(salonId);
      return view(salonId);
    },

    async addClosure({ salonId, from, to, reason }) {
      await loadSalon(salonId);
      const date = await today();
      checkRange(from, to, date);
      rejectConflicts(await conflicts.closure(salonId, { from, to }));
      const branchId = await deps.mainBranches?.idOf(salonId);
      const created = await closures.create({
        salonId: toObjectId(salonId),
        ...(branchId === undefined ? {} : { branchId }),
        from,
        to,
        reason,
      });
      return toClosure(created, date);
    },

    async updateClosure({ salonId, id, ...patch }) {
      const date = await today();
      const current = (await closures.forSalon(salonId)).find((c) => c.id === id);
      if (current === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      // A closure that has started is history: customers and bookings already rely on it.
      if (current.from <= date)
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      const next = {
        from: patch.from ?? current.from,
        to: patch.to ?? current.to,
        reason: patch.reason ?? current.reason,
      };
      checkRange(next.from, next.to, date);
      rejectConflicts(await conflicts.closure(salonId, next));
      const updated = await closures.updateById(id, next);
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      return toClosure(updated, date);
    },

    async removeClosure({ salonId, id }) {
      const date = await today();
      const current = (await closures.forSalon(salonId)).find((c) => c.id === id);
      if (current === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      if (current.from <= date)
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      await closures.remove(salonId, id);
    },
  };
};
