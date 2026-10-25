import type { Types } from 'mongoose';
import { MAIN_BRANCH_DEFAULT_NAME } from '../../constants/branches';
import type { BranchRaw } from '../../models/branch.model';
import type { BranchesRepository } from '../../repositories/branches.repository';
import type { AreasRepository } from '../../repositories/locations.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { computeBranchMissing } from './completeness';

/** Salon fields that live on branches; the salon-level endpoints copy them to the main branch. */
export const MAIN_BRANCH_MIRRORED_FIELDS = [
  'location',
  'locationText',
  'cityId',
  'areaId',
  'phone',
  'whatsapp',
  'weeklySchedule',
] as const;

/** Salon fields that live on the main branch and are copied there by the salon-level endpoints. */
export type MainBranchMirror = Partial<
  Pick<
    BranchRaw,
    'location' | 'locationText' | 'cityId' | 'areaId' | 'phone' | 'whatsapp' | 'weeklySchedule'
  >
>;

/**
 * The salon's main branch for the salon-level endpoints that existed before branches (§5.16):
 * new services, staff, closures and leaves land on it and salon address/contacts/hours edits are
 * copied to it, so today's clients keep working while the per-branch endpoints roll out.
 */
export interface MainBranches {
  /** The main branch, created from the salon's current fields when the salon has none yet. */
  ensure(salonId: string): Promise<Entity<BranchRaw>>;
  /** Its id, for rows a salon-level endpoint creates. */
  idOf(salonId: string): Promise<Types.ObjectId>;
  /** Copies a salon-level change of address, contacts or hours onto the main branch. */
  mirror(
    salonId: string,
    set: MainBranchMirror,
    unset?: readonly (keyof MainBranchMirror)[],
  ): Promise<void>;
}

export interface MainBranchesDeps {
  readonly branches: Pick<BranchesRepository, 'findById' | 'main' | 'create' | 'patch'>;
  readonly salons: Pick<SalonsRepository, 'findById' | 'patch'>;
  readonly areas: Pick<AreasRepository, 'findById'>;
}

export const createMainBranches = ({ branches, salons, areas }: MainBranchesDeps): MainBranches => {
  const create = async (salonId: string): Promise<Entity<BranchRaw>> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new RangeError('salon not found for its main branch');
    const area = salon.areaId === undefined ? null : await areas.findById(salon.areaId);
    const missing = computeBranchMissing({ ...salon, activeServices: 0, qualifiedStaff: 0 });
    try {
      const branch = await branches.create({
        salonId: toObjectId(salonId),
        name: area?.name ?? MAIN_BRANCH_DEFAULT_NAME,
        isMain: true,
        status: 'ACTIVE',
        ...(salon.location?.coordinates.length === 2
          ? { location: salon.location as NonNullable<BranchRaw['location']> }
          : {}),
        ...(salon.locationText === undefined ? {} : { locationText: salon.locationText }),
        ...(salon.cityId === undefined ? {} : { cityId: toObjectId(salon.cityId) }),
        ...(salon.areaId === undefined ? {} : { areaId: toObjectId(salon.areaId) }),
        ...(salon.phone === undefined ? {} : { phone: salon.phone }),
        ...(salon.whatsapp === undefined ? {} : { whatsapp: salon.whatsapp }),
        weeklySchedule: salon.weeklySchedule,
        completeness: { missing, isComplete: missing.length === 0 },
      });
      await salons.patch(salonId, { set: { mainBranchId: toObjectId(branch.id), branchCount: 1 } });
      return branch;
    } catch (error) {
      // Two requests created it at the same time: the unique main-branch index kept one.
      if (!isDuplicateKeyError(error)) throw error;
      const existing = await branches.main(salonId);
      if (existing === null) throw error;
      return existing;
    }
  };

  const ensure: MainBranches['ensure'] = async (salonId) => {
    const salon = await salons.findById(salonId);
    if (salon?.mainBranchId !== undefined) {
      const linked = await branches.findById(salon.mainBranchId);
      if (linked !== null) return linked;
    }
    const main = await branches.main(salonId);
    if (main !== null) {
      await salons.patch(salonId, { set: { mainBranchId: toObjectId(main.id) } });
      return main;
    }
    return create(salonId);
  };

  return {
    ensure,
    async idOf(salonId) {
      return toObjectId((await ensure(salonId)).id);
    },
    async mirror(salonId, set, unset = []) {
      const main = await ensure(salonId);
      await branches.patch(main.id, { set: { ...set }, unset });
    },
  };
};
