import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { StaffLeaveRaw } from '../../models/staffLeave.model';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { LeavesRepository } from '../../repositories/leaves.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from '../../utils/errors';
import { localDateOf } from '../../utils/time';
import type { SettingsService } from '../settings';
import type { BookingConflict } from '../salons/hoursService';

export interface LeaveView {
  readonly id: string;
  readonly memberId: string;
  readonly from: string;
  readonly to: string;
  readonly note: string | null;
  /** Only leaves that start after today can still be changed or removed. */
  readonly editable: boolean;
}

/** Upcoming bookings of the member that a leave would break; none until bookings exist. */
export interface LeaveConflicts {
  check(input: {
    salonId: string;
    memberId: string;
    from: string;
    to: string;
  }): Promise<BookingConflict[]>;
}
export const noLeaveConflicts: LeaveConflicts = { check: () => Promise.resolve([]) };

export interface LeavesService {
  list(input: { salonId: string; memberId: string }): Promise<LeaveView[]>;
  add(input: {
    salonId: string;
    memberId: string;
    from: string;
    to: string;
    note?: string | undefined;
  }): Promise<LeaveView>;
  update(input: {
    salonId: string;
    memberId: string;
    leaveId: string;
    from?: string | undefined;
    to?: string | undefined;
    /** `null` clears the note. */
    note?: string | null | undefined;
  }): Promise<LeaveView>;
  remove(input: { salonId: string; memberId: string; leaveId: string }): Promise<void>;
}

export interface LeavesDeps {
  readonly leaves: LeavesRepository;
  readonly members: Pick<MembersRepository, 'findOne'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly conflicts?: LeaveConflicts;
  readonly now?: () => Date;
}

const invalid = (field: string): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
      } satisfies ErrorDetail,
    ],
  });

export const createLeavesService = (deps: LeavesDeps): LeavesService => {
  const { leaves, members, settings } = deps;
  const conflicts = deps.conflicts ?? noLeaveConflicts;
  const now = deps.now ?? ((): Date => new Date());
  const today = async (): Promise<string> => localDateOf(now(), await settings.get('timezone'));

  const view = (l: Entity<StaffLeaveRaw>, date: string): LeaveView => ({
    id: l.id,
    memberId: l.memberId,
    from: l.from,
    to: l.to,
    note: l.note === undefined || l.note === '' ? null : l.note,
    editable: l.from > date,
  });

  /** The member must belong to the caller's salon (others look missing). */
  /** The member of that salon; a leave belongs to the member's branch (§3.4). */
  const requireMember = async (
    salonId: string,
    memberId: string,
  ): Promise<{ branchId?: string | undefined }> => {
    const member = await members.findOne({ _id: memberId, salonId });
    if (member === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return member;
  };

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

  const findLeave = async (memberId: string, leaveId: string): Promise<Entity<StaffLeaveRaw>> => {
    const leave = (await leaves.forMember(memberId)).find((l) => l.id === leaveId);
    if (leave === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return leave;
  };

  return {
    async list({ salonId, memberId }) {
      await requireMember(salonId, memberId);
      const date = await today();
      return (await leaves.forMember(memberId))
        .filter((l) => l.to >= date)
        .map((l) => view(l, date));
    },

    async add({ salonId, memberId, from, to, note }) {
      const member = await requireMember(salonId, memberId);
      const date = await today();
      if (to < from) throw invalid('body.to');
      if (from < date) throw invalid('body.from');
      rejectConflicts(await conflicts.check({ salonId, memberId, from, to }));
      const created = await leaves.create({
        memberId: toObjectId(memberId),
        salonId: toObjectId(salonId),
        ...(member.branchId === undefined ? {} : { branchId: toObjectId(member.branchId) }),
        from,
        to,
        ...(note === undefined ? {} : { note }),
      });
      return view(created, date);
    },

    async update({ salonId, memberId, leaveId, ...patch }) {
      await requireMember(salonId, memberId);
      const date = await today();
      const current = await findLeave(memberId, leaveId);
      if (current.from <= date)
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      const next = { from: patch.from ?? current.from, to: patch.to ?? current.to };
      if (next.to < next.from) throw invalid('body.to');
      if (next.from < date) throw invalid('body.from');
      rejectConflicts(await conflicts.check({ salonId, memberId, ...next }));
      // An empty note means "none": the repository ignores undefined, so null is stored as ''.
      const note = patch.note === undefined ? current.note : (patch.note ?? '');
      const updated = await leaves.updateById(leaveId, {
        ...next,
        ...(note === undefined ? {} : { note }),
      });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      return view(updated, date);
    },

    async remove({ salonId, memberId, leaveId }) {
      await requireMember(salonId, memberId);
      const date = await today();
      const current = await findLeave(memberId, leaveId);
      if (current.from <= date)
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      await leaves.remove(memberId, leaveId);
    },
  };
};
