import type { Model } from 'mongoose';
import { OPEN_BRANCH_STATUSES, type BranchStatus } from '../constants/branches';
import { BranchModel, type BranchRaw } from '../models/branch.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

/** Data access for salon branches (§3.3a). Branches are closed, never deleted. */
export class BranchesRepository extends BaseRepository<BranchRaw> {
  constructor(model: Model<BranchRaw> = BranchModel) {
    super(model);
  }

  /** The salon's branches, main first, then by name; closed ones only when asked for. */
  async forSalon(
    salonId: string,
    options: { includeClosed?: boolean } = {},
  ): Promise<Entity<BranchRaw>[]> {
    if (!isObjectIdString(salonId)) return [];
    const statuses: readonly BranchStatus[] = options.includeClosed
      ? ['ACTIVE', 'OFFLINE', 'CLOSED']
      : OPEN_BRANCH_STATUSES;
    return this.findMany({ salonId, status: { $in: [...statuses] } }, {
      isMain: -1,
      'name.en': 1,
    } as never);
  }

  /** Non-closed branches of a salon (the branch limit and the last-branch rule count these). */
  countOpen(salonId: string): Promise<number> {
    if (!isObjectIdString(salonId)) return Promise.resolve(0);
    return this.count({ salonId, status: { $in: [...OPEN_BRANCH_STATUSES] } });
  }

  /** The salon's main branch, or `null` before its first branch exists. */
  main(salonId: string): Promise<Entity<BranchRaw> | null> {
    if (!isObjectIdString(salonId)) return Promise.resolve(null);
    return this.findOne({ salonId, isMain: true });
  }

  /** A branch only when it belongs to that salon (scopes every merchant and admin lookup). */
  async findInSalon(salonId: string, branchId: string): Promise<Entity<BranchRaw> | null> {
    if (!isObjectIdString(salonId) || !isObjectIdString(branchId)) return null;
    return this.findOne({ _id: branchId, salonId });
  }

  async patch(
    id: string,
    change: { set: Record<string, unknown>; unset?: readonly string[] },
  ): Promise<Entity<BranchRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const unset = change.unset ?? [];
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id },
        {
          $set: change.set,
          ...(unset.length === 0 ? {} : { $unset: Object.fromEntries(unset.map((f) => [f, 1])) }),
        },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<BranchRaw>(updated);
  }
}
