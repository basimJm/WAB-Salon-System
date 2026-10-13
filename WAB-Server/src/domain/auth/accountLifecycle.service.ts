import {
  ACCOUNT_AUDIT_ACTIONS,
  ANONYMIZED_EMAIL_DOMAIN,
  ANONYMIZED_FIRST_NAME,
  ANONYMIZED_LAST_NAME,
  ANONYMIZED_PHONE_NUMBER,
  ANONYMIZED_PHONE_PREFIX,
  CUSTOMER_AUDIT_ENTITY,
  PURGE_BATCH_SIZE,
} from '../../constants/accountLifecycle';
import { REVOKE_REASONS } from '../../constants/auth';
import { ERROR_CODES } from '../../constants/errorCodes';
import { MS_PER_DAY } from '../../constants/time';
import type { CustomerRaw } from '../../models/customer.model';
import type { MemberRaw } from '../../models/member.model';
import type { StorageProvider } from '../../providers';
import type {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { AuditWriter } from '../audit';
import type { SettingsService } from '../settings';
import type { RefreshTokenService } from './refreshTokens.service';

/** Who performs an admin action, for the audit log (CLAUDE.md §5.12). */
export interface AdminActor {
  readonly adminId: string;
  readonly ip: string;
  readonly userAgent: string;
}

export interface AccountLifecycleService {
  /** Admin: blocks a customer (reason + audit), ends every session. Blocking twice is a no-op. */
  blockCustomer(input: { customerId: string; reason: string; actor: AdminActor }): Promise<void>;
  /** Admin: lifts a block; a deletion request made before the block is dropped. */
  unblockCustomer(input: { customerId: string; reason: string; actor: AdminActor }): Promise<void>;
  /** Customer: starts the grace period and ends every session; logging in restores the account. */
  requestCustomerDeletion(input: { customerId: string }): Promise<{ deletionScheduledAt: Date }>;
  /** Owner or admin: switches a non-owner member off and ends their sessions. */
  deactivateMember(input: { memberId: string; salonId: string }): Promise<void>;
  reactivateMember(input: { memberId: string; salonId: string }): Promise<void>;
  /** Job `accounts:purge`: anonymizes every customer whose grace period ended; returns the count. */
  purgeDueCustomers(): Promise<number>;
}

export interface AccountLifecycleDeps {
  readonly customers: CustomersRepository;
  readonly members: MembersRepository;
  readonly installations: InstallationsRepository;
  readonly refreshTokens: RefreshTokenService;
  readonly storage: StorageProvider;
  readonly audit: AuditWriter;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly logger: Logger;
  readonly now?: () => Date;
}

/**
 * Account blocking, deletion with a grace period, anonymization and member deactivation
 * (BUSINESS_DOMAIN.md §5.15). Every change that must end access also revokes the refresh tokens
 * in the same call; the short-lived access token (15 min) is not revocable.
 */
export const createAccountLifecycleService = (
  deps: AccountLifecycleDeps,
): AccountLifecycleService => {
  const { customers, members, installations, refreshTokens, storage, audit, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const requireCustomer = async (id: string): Promise<Entity<CustomerRaw>> => {
    const customer = await customers.findById(id);
    if (customer === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return customer;
  };

  const requireMember = async (memberId: string, salonId: string): Promise<Entity<MemberRaw>> => {
    const member = await members.findById(memberId);
    // A member of another salon looks the same as a missing one.
    if (member === null || member.salonId !== salonId) {
      throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    }
    return member;
  };

  const anonymize = async (customer: Entity<CustomerRaw>): Promise<boolean> => {
    const done = await customers.transition(customer.id, ['DELETION_PENDING'], {
      set: {
        status: 'DELETED',
        firstName: ANONYMIZED_FIRST_NAME,
        lastName: ANONYMIZED_LAST_NAME,
        email: `${customer.id}@${ANONYMIZED_EMAIL_DOMAIN}`,
        phone: {
          countryCode: customer.phone.countryCode,
          dialCode: customer.phone.dialCode,
          number: ANONYMIZED_PHONE_NUMBER,
          e164: `${ANONYMIZED_PHONE_PREFIX}:${customer.id}`,
        },
        pushEnabled: false,
      },
      unset: ['avatarKey', 'blockedReason', 'blockedAt', 'lastActiveAt'],
    });
    if (done === null) return false;
    await Promise.all([
      installations.detachCustomer(customer.id),
      refreshTokens.revokeAll('CUSTOMER', customer.id, REVOKE_REASONS.accountDeletion),
    ]);
    if (customer.avatarKey !== undefined) {
      try {
        await storage.delete([customer.avatarKey]);
      } catch (error) {
        // The account is already anonymized; a leftover picture is cleaned by the next sweep.
        logger.warn({ customerId: customer.id, err: error }, 'avatar delete failed during purge');
      }
    }
    return true;
  };

  return {
    async blockCustomer({ customerId, reason, actor }) {
      const customer = await requireCustomer(customerId);
      if (customer.status === 'BLOCKED') return;
      if (customer.status === 'DELETED') throw new ConflictError();
      const blocked = await customers.transition(customer.id, ['ACTIVE', 'DELETION_PENDING'], {
        set: { status: 'BLOCKED', blockedReason: reason, blockedAt: now() },
      });
      if (blocked === null) throw new ConflictError();
      await refreshTokens.revokeAll('CUSTOMER', customer.id, REVOKE_REASONS.accountBlocked);
      await audit.record({
        adminId: actor.adminId,
        action: ACCOUNT_AUDIT_ACTIONS.customerBlock,
        entityType: CUSTOMER_AUDIT_ENTITY,
        entityId: customer.id,
        before: { status: customer.status },
        after: { status: 'BLOCKED' },
        reason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
    },

    async unblockCustomer({ customerId, reason, actor }) {
      const customer = await requireCustomer(customerId);
      const restored = await customers.transition(customer.id, ['BLOCKED'], {
        set: { status: 'ACTIVE' },
        unset: ['blockedReason', 'blockedAt', 'deletionRequestedAt', 'deletionScheduledAt'],
      });
      if (restored === null) throw new ConflictError();
      await audit.record({
        adminId: actor.adminId,
        action: ACCOUNT_AUDIT_ACTIONS.customerUnblock,
        entityType: CUSTOMER_AUDIT_ENTITY,
        entityId: customer.id,
        before: { status: 'BLOCKED' },
        after: { status: 'ACTIVE' },
        reason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
    },

    async requestCustomerDeletion({ customerId }) {
      const customer = await requireCustomer(customerId);
      const requestedAt = now();
      const graceDays = await deps.settings.get('account.deletionGraceDays');
      const deletionScheduledAt = new Date(requestedAt.getTime() + graceDays * MS_PER_DAY);
      const pending = await customers.transition(customer.id, ['ACTIVE'], {
        set: {
          status: 'DELETION_PENDING',
          deletionRequestedAt: requestedAt,
          deletionScheduledAt,
        },
      });
      if (pending === null) throw new ConflictError();
      await Promise.all([
        refreshTokens.revokeAll('CUSTOMER', customer.id, REVOKE_REASONS.accountDeletion),
        installations.detachCustomer(customer.id),
      ]);
      return { deletionScheduledAt };
    },

    async deactivateMember({ memberId, salonId }) {
      const member = await requireMember(memberId, salonId);
      // Every salon has exactly one owner; removing the owner is the salon-deletion flow.
      if (member.role === 'OWNER') throw new BusinessRuleError({ code: ERROR_CODES.LAST_OWNER });
      if (!member.active) return;
      await members.setActive(member.id, false);
      await Promise.all([
        refreshTokens.revokeAll('MEMBER', member.id, REVOKE_REASONS.memberDeactivated),
        installations.detachMember(member.id),
      ]);
    },

    async reactivateMember({ memberId, salonId }) {
      const member = await requireMember(memberId, salonId);
      if (!member.active) await members.setActive(member.id, true);
    },

    async purgeDueCustomers() {
      let purged = 0;
      for (;;) {
        const batch = await customers.findDueForPurge(now(), PURGE_BATCH_SIZE);
        for (const customer of batch) {
          if (await anonymize(customer)) purged += 1;
        }
        if (batch.length < PURGE_BATCH_SIZE) return purged;
      }
    },
  };
};
