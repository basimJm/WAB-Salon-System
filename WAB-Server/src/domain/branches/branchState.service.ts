import type { BranchCompletenessItem } from '../../constants/branches';
import type { BranchRaw } from '../../models/branch.model';
import type { BranchesRepository } from '../../repositories/branches.repository';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { Entity } from '../../utils/database/plain';
import type { Logger } from '../../utils/logger';
import type { BranchSummary } from '../salons/completeness';
import type { SalonStateNotifier } from '../salons/salonState.service';
import { computeBranchMissing } from './completeness';

/** Counts of one branch that live in other collections. */
export interface BranchFacts {
  activeServiceCount(branchId: string): Promise<number>;
  qualifiedStaffCount(branchId: string): Promise<number>;
}

export interface BranchStateService {
  /**
   * Recomputes the completeness of every open branch of the salon, tells the owner when a branch
   * of a multi-branch salon becomes bookable or stops being bookable, and summarises the result
   * for the salon's own completeness (§5.2).
   */
  recompute(salonId: string): Promise<BranchSummary>;
}

export interface BranchStateDeps {
  readonly branches: Pick<BranchesRepository, 'forSalon' | 'patch'>;
  readonly facts: BranchFacts;
  readonly notifier?: SalonStateNotifier;
  readonly logger?: Logger;
}

const bookable = (branch: Pick<BranchRaw, 'status' | 'completeness'>): boolean =>
  branch.status === 'ACTIVE' && branch.completeness.isComplete;

export const createBranchStateService = (deps: BranchStateDeps): BranchStateService => {
  const { branches, facts, notifier, logger } = deps;

  const tell = async (
    branch: Entity<BranchRaw>,
    event: 'branch.live' | 'branch.not_bookable',
  ): Promise<void> => {
    try {
      await notifier?.changed({
        salonId: branch.salonId,
        event,
        branch: { id: branch.id, name: branch.name },
      });
    } catch (error) {
      logger?.error({ err: error, branchId: branch.id, event }, 'branch state notification failed');
    }
  };

  return {
    async recompute(salonId) {
      const open = await branches.forSalon(salonId);
      const updated: Entity<BranchRaw>[] = [];
      for (const branch of open) {
        const [activeServices, qualifiedStaff] = await Promise.all([
          facts.activeServiceCount(branch.id),
          facts.qualifiedStaffCount(branch.id),
        ]);
        const missing = computeBranchMissing({ ...branch, activeServices, qualifiedStaff });
        const completeness = { missing, isComplete: missing.length === 0 };
        const changed =
          completeness.isComplete !== branch.completeness.isComplete ||
          missing.join() !== branch.completeness.missing.join();
        const current = changed
          ? ((await branches.patch(branch.id, { set: { completeness } })) ?? {
              ...branch,
              completeness,
            })
          : branch;
        // A single-branch salon is announced by the salon events (salon.live / not_bookable).
        if (open.length > 1 && branch.status === 'ACTIVE' && changed) {
          if (completeness.isComplete && !branch.completeness.isComplete)
            await tell(current, 'branch.live');
          if (!completeness.isComplete && branch.completeness.isComplete)
            await tell(current, 'branch.not_bookable');
        }
        updated.push(current);
      }
      const main = updated.find((branch) => branch.isMain);
      return {
        bookable: updated.some(bookable),
        mainMissing:
          main === undefined ? null : (main.completeness.missing as BranchCompletenessItem[]),
      };
    },
  };
};

/** Branch counts from the services and members collections (staff as in §5.2: can take bookings). */
export const createBranchFacts = (
  members: Pick<MembersRepository, 'findMany'>,
  services: Pick<SalonServicesRepository, 'count'>,
): BranchFacts => ({
  activeServiceCount: (branchId) => services.count({ branchId, active: true }),
  async qualifiedStaffCount(branchId) {
    const staff = await members.findMany({
      branchId,
      active: true,
      providesServices: true,
    });
    return staff.filter(
      (m) => (m.staff?.serviceIds.length ?? 0) > 0 && (m.staff?.workingDays.length ?? 0) > 0,
    ).length;
  },
});
