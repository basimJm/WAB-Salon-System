import { ADMIN_BRANCH_AUDIT } from '../../constants/branches';
import type { Logger } from '../../utils/logger';
import type { OnBehalf } from '../adminSalonEdit/adminSalonEdit.service';
import type { AuditWriter } from '../audit/audit.service';
import type { SalonStateNotifier } from '../salons/salonState.service';
import type { BranchInput, BranchPatch, BranchView, BranchesService } from './branches.service';

type OnBranch = OnBehalf & { readonly branchId: string };

/** Admin management of any salon's branches (§5.16): the owner's rules plus reason + audit + notice. */
export interface AdminBranchesService {
  list(salonId: string): Promise<BranchView[]>;
  get(salonId: string, branchId: string): Promise<BranchView>;
  create(input: OnBehalf & { branch: BranchInput }): Promise<BranchView>;
  update(input: OnBranch & { patch: BranchPatch }): Promise<BranchView>;
  setMain(input: OnBranch): Promise<BranchView>;
  /** The reason is also what the branch shows as its offline reason. */
  setOffline(input: OnBranch): Promise<BranchView>;
  setOnline(input: OnBranch): Promise<BranchView>;
  close(input: OnBranch): Promise<BranchView>;
}

export interface AdminBranchesDeps {
  readonly branches: BranchesService;
  readonly audit: AuditWriter;
  readonly notifier: SalonStateNotifier;
  readonly logger: Logger;
}

/**
 * Every write goes through the same branches service the owner uses (limits, last branch,
 * upcoming bookings, completeness), so no rule is duplicated here. The audit is written after the
 * change; offline/online already tell the owner and the branch managers (`branch.offline|online`),
 * the other writes send `salon.edited_by_admin` (area `branches`). A failed notice is only logged.
 */
export const createAdminBranchesService = ({
  branches,
  audit,
  notifier,
  logger,
}: AdminBranchesDeps): AdminBranchesService => {
  const record = async (
    on: OnBehalf,
    action: string,
    branchId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> => {
    await audit.record({
      adminId: on.actor.adminId,
      action,
      entityType: ADMIN_BRANCH_AUDIT.entityType,
      entityId: branchId,
      before,
      after,
      reason: on.reason,
      ip: on.actor.ip,
      userAgent: on.actor.userAgent,
    });
  };

  const tell = async ({ salonId, reason }: OnBehalf): Promise<void> => {
    try {
      await notifier.changed({ salonId, event: 'salon.edited_by_admin', reason, area: 'branches' });
    } catch (error) {
      logger.warn({ salonId, err: error }, 'branch edit notice failed');
    }
  };

  const actorOf = (on: OnBehalf): { type: 'ADMIN'; id: string } => ({
    type: 'ADMIN',
    id: on.actor.adminId,
  });

  return {
    list: (salonId) => branches.list(salonId),
    get: (salonId, branchId) => branches.get(salonId, branchId),

    async create({ branch, ...on }) {
      const created = await branches.create(on.salonId, branch);
      await record(on, ADMIN_BRANCH_AUDIT.actions.create, created.id, null, created);
      await tell(on);
      return created;
    },

    async update({ branchId, patch, ...on }) {
      const before = await branches.get(on.salonId, branchId);
      const after = await branches.update(on.salonId, branchId, patch);
      await record(on, ADMIN_BRANCH_AUDIT.actions.update, branchId, before, after);
      await tell(on);
      return after;
    },

    async setMain({ branchId, ...on }) {
      const after = await branches.setMain(on.salonId, branchId);
      await record(on, ADMIN_BRANCH_AUDIT.actions.main, branchId, null, { isMain: true });
      await tell(on);
      return after;
    },

    async setOffline({ branchId, ...on }) {
      const after = await branches.setOffline({
        salonId: on.salonId,
        branchId,
        reason: on.reason,
        actor: actorOf(on),
      });
      await record(
        on,
        ADMIN_BRANCH_AUDIT.actions.offline,
        branchId,
        { status: 'ACTIVE' },
        {
          status: after.status,
        },
      );
      return after;
    },

    async setOnline({ branchId, ...on }) {
      const after = await branches.setOnline({
        salonId: on.salonId,
        branchId,
        actor: actorOf(on),
      });
      await record(
        on,
        ADMIN_BRANCH_AUDIT.actions.online,
        branchId,
        { status: 'OFFLINE' },
        {
          status: after.status,
        },
      );
      return after;
    },

    async close({ branchId, ...on }) {
      const before = await branches.get(on.salonId, branchId);
      const after = await branches.close({
        salonId: on.salonId,
        branchId,
        actor: actorOf(on),
      });
      await record(
        on,
        ADMIN_BRANCH_AUDIT.actions.close,
        branchId,
        { status: before.status },
        {
          status: after.status,
        },
      );
      await tell(on);
      return after;
    },
  };
};
