import type { Model } from 'mongoose';
import { StaffLeaveModel, type StaffLeaveRaw } from '../models/staffLeave.model';
import { isObjectIdString } from '../utils/database/ids';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class LeavesRepository extends BaseRepository<StaffLeaveRaw> {
  constructor(model: Model<StaffLeaveRaw> = StaffLeaveModel) {
    super(model);
  }

  /** A member's leaves, soonest first. */
  forMember(memberId: string): Promise<Entity<StaffLeaveRaw>[]> {
    return this.findMany({ memberId }, { from: 1 });
  }

  /** Leaves of a salon that have not ended before `date` (the on-leave-today list and availability). */
  upcomingForSalon(salonId: string, date: string): Promise<Entity<StaffLeaveRaw>[]> {
    return this.findMany({ salonId, to: { $gte: date } }, { from: 1 });
  }

  async remove(memberId: string, id: string): Promise<boolean> {
    if (!isObjectIdString(id) || !isObjectIdString(memberId)) return false;
    const result = await this.model.deleteOne({ _id: id, memberId }).exec();
    return result.deletedCount > 0;
  }
}
