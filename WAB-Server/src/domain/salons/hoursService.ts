import type { BranchesRepository } from '../../repositories/branches.repository';
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
  ForbiddenError,
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
  /** `branchId` limits the check to that branch's bookings. */
  weekly(
    salonId: string,
    days: readonly ScheduleDay[],
    branchId?: string,
  ): Promise<BookingConflict[]>;
  closure(
    salonId: string,
    range: { from: string; to: string },
    branchId?: string,
  ): Promise<BookingConflict[]>;
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

/**
 * Hours and closures of one branch (§3.3a). `scope` = the caller's branch; without one the
 * salon-level endpoints work on the main branch. Before branch wiring (unit tests) the salon's own.
 */
export interface HoursService {
  get(salonId: string, scope?: string): Promise<HoursView>;
  /** Upcoming PENDING/APPROVED bookings a new weekly schedule would break; nothing is saved. */
  previewWeekly(
    salonId: string,
    days: readonly WeeklyDayInput[],
    scope?: string,
  ): Promise<BookingConflict[]>;
  /** Upcoming PENDING/APPROVED bookings a closure would break; nothing is saved. */
  previewClosure(input: {
    salonId: string;
    from: string;
    to: string;
    scope?: string | undefined;
  }): Promise<BookingConflict[]>;
  setWeekly(salonId: string, days: readonly WeeklyDayInput[], scope?: string): Promise<HoursView>;
  addClosure(input: {
    salonId: string;
    scope?: string | undefined;
    from: string;
    to: string;
    reason: string;
  }): Promise<ClosureView>;
  updateClosure(input: {
    salonId: string;
    scope?: string | undefined;
    id: string;
    from?: string | undefined;
    to?: string | undefined;
    reason?: string | undefined;
  }): Promise<ClosureView>;
  removeClosure(input: { salonId: string; id: string; scope?: string | undefined }): Promise<void>;
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
  readonly branches?: Pick<BranchesRepository, 'findInSalon' | 'patch'>;
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

  /** The branch the request works on, or `null` (salon-wide, before branch wiring). */
  const branchFor = async (
    salonId: string,
    scope?: string,
  ): Promise<{ id: string; isMain: boolean; weeklySchedule: ScheduleDay[] } | null> => {
    const id = scope ?? (await deps.mainBranches?.idOf(salonId))?.toString();
    if (id === undefined || deps.branches === undefined) return null;
    const branch = await deps.branches.findInSalon(salonId, id);
    if (branch === null) throw new NotFoundError({ code: ERROR_CODES.BRANCH_NOT_FOUND });
    return branch;
  };

  /** Closures of the branch (all of the salon's before branch wiring). */
  const closuresOf = async (
    salonId: string,
    branch: { id: string } | null,
  ): Promise<Entity<SalonClosureRaw>[]> => {
    const all = await closures.forSalon(salonId);
    return branch === null ? all : all.filter((c) => c.branchId === branch.id);
  };

  /** A closure of the salon that the caller may change (`BRANCH_SCOPE_DENIED` for another branch). */
  const findClosure = async (
    salonId: string,
    id: string,
    scope?: string,
  ): Promise<Entity<SalonClosureRaw>> => {
    const current = (await closures.forSalon(salonId)).find((c) => c.id === id);
    if (current === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    if (scope !== undefined && current.branchId !== scope) {
      throw new ForbiddenError({ code: ERROR_CODES.BRANCH_SCOPE_DENIED });
    }
    return current;
  };

  const view = async (salonId: string, scope?: string): Promise<HoursView> => {
    const [salon, branch, date, timeZone] = await Promise.all([
      loadSalon(salonId),
      branchFor(salonId, scope),
      today(),
      settings.get('timezone'),
    ]);
    const schedule = branch?.weeklySchedule ?? salon.weeklySchedule;
    const all = await closuresOf(salonId, branch);
    return {
      weeklySchedule: schedule,
      closures: all.filter((c) => c.to >= date).map((c) => toClosure(c, date)),
      today: todaysHours(schedule, all, now(), timeZone),
    };
  };

  const checkRange = (from: string, to: string, date: string): void => {
    if (to < from) throw invalid('body.to');
    if (from < date) throw invalid('body.from');
  };

  /** Checks a full week (every day once, open < close, on the slot grid) and orders it. */
  const normalizeWeek = async (input: readonly WeeklyDayInput[]): Promise<ScheduleDay[]> => {
    const step = await settings.get('booking.slotMinutes');
    const present = new Set(input.map((d) => d.day));
    if (input.length !== SCHEDULE_DAY_ORDER.length || present.size !== SCHEDULE_DAY_ORDER.length) {
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
    return week;
  };

  return {
    get: view,

    async setWeekly(salonId, input, scope) {
      const week = await normalizeWeek(input);
      const branch = await branchFor(salonId, scope);
      rejectConflicts(await conflicts.weekly(salonId, week, branch?.id));
      if (branch !== null) await deps.branches?.patch(branch.id, { set: { weeklySchedule: week } });
      // The salon keeps the main branch's hours for the readers not on branches yet (SRV-144).
      if (branch === null || branch.isMain) {
        const updated = await salons.patch(salonId, { set: { weeklySchedule: week } });
        if (updated === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      }
      await state.recompute(salonId);
      return view(salonId, scope);
    },

    async previewWeekly(salonId, input, scope) {
      const week = await normalizeWeek(input);
      const branch = await branchFor(salonId, scope);
      return conflicts.weekly(salonId, week, branch?.id);
    },

    async previewClosure({ salonId, from, to, scope }) {
      await loadSalon(salonId);
      checkRange(from, to, await today());
      const branch = await branchFor(salonId, scope);
      return conflicts.closure(salonId, { from, to }, branch?.id);
    },

    async addClosure({ salonId, from, to, reason, scope }) {
      await loadSalon(salonId);
      const date = await today();
      checkRange(from, to, date);
      const branch = await branchFor(salonId, scope);
      rejectConflicts(await conflicts.closure(salonId, { from, to }, branch?.id));
      const created = await closures.create({
        salonId: toObjectId(salonId),
        ...(branch === null ? {} : { branchId: toObjectId(branch.id) }),
        from,
        to,
        reason,
      });
      return toClosure(created, date);
    },

    async updateClosure({ salonId, id, scope, ...patch }) {
      const date = await today();
      const current = await findClosure(salonId, id, scope);
      // A closure that has started is history: customers and bookings already rely on it.
      if (current.from <= date)
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      const next = {
        from: patch.from ?? current.from,
        to: patch.to ?? current.to,
        reason: patch.reason ?? current.reason,
      };
      checkRange(next.from, next.to, date);
      rejectConflicts(await conflicts.closure(salonId, next, current.branchId));
      const updated = await closures.updateById(id, next);
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      return toClosure(updated, date);
    },

    async removeClosure({ salonId, id, scope }) {
      const date = await today();
      const current = await findClosure(salonId, id, scope);
      if (current.from <= date)
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      await closures.remove(salonId, id);
    },
  };
};
