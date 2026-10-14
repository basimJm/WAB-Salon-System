import { ADMIN_CUSTOMER_AUDIT, ADMIN_CUSTOMER_MAX_DEVICES } from '../../constants/adminCustomers';
import { CUSTOMER_AUDIT_ENTITY } from '../../constants/accountLifecycle';
import type { CustomerStatus, Gender, Language, Platform } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { CustomerRaw } from '../../models/customer.model';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type {
  CustomersRepository,
  InstallationsRepository,
} from '../../repositories/identity.repository';
import type { Entity } from '../../utils/database/plain';
import { ConflictError, NotFoundError } from '../../utils/errors';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AccountLifecycleService, AdminActor } from '../auth/accountLifecycle.service';

export interface AdminCustomerRow {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly gender: Gender;
  readonly cityId: string;
  readonly status: CustomerStatus;
  readonly registeredAt: Date;
  readonly lastActiveAt: Date | null;
  readonly bookingsCount: number;
}

export interface AdminCustomerDetail extends AdminCustomerRow {
  readonly email: string;
  readonly areaId: string;
  readonly language: Language;
  readonly pushEnabled: boolean;
  readonly blockedReason: string | null;
  readonly blockedAt: Date | null;
  readonly deletionScheduledAt: Date | null;
  /** The id the analytics journey (A11) is looked up by. */
  readonly journeyUserId: string;
  readonly devices: readonly {
    readonly app: string;
    readonly platform: Platform;
    readonly appVersion: string;
    readonly lastSeenAt: Date;
    readonly pushToken: boolean;
  }[];
}

export interface AdminCustomersService {
  list(input: {
    params: PaginationParams;
    status?: CustomerStatus | undefined;
    gender?: Gender | undefined;
    cityId?: string | undefined;
    q?: string | undefined;
  }): Promise<{ items: AdminCustomerRow[]; total: number }>;
  detail(id: string): Promise<AdminCustomerDetail>;
  block(input: { id: string; reason: string; actor: AdminActor }): Promise<void>;
  unblock(input: { id: string; reason: string; actor: AdminActor }): Promise<void>;
  /** Starts the deletion grace period for an active account (with reason and audit). */
  delete(input: {
    id: string;
    reason: string;
    actor: AdminActor;
  }): Promise<{ deletionScheduledAt: Date }>;
  /** Brings back an account that is waiting for deletion. */
  restore(input: { id: string; reason: string; actor: AdminActor }): Promise<void>;
}

export interface AdminCustomersDeps {
  readonly customers: Pick<CustomersRepository, 'findPage' | 'findById' | 'transition'>;
  readonly installations: Pick<InstallationsRepository, 'findMany'>;
  readonly bookings: Pick<BookingsRepository, 'count'>;
  readonly lifecycle: Pick<
    AccountLifecycleService,
    'blockCustomer' | 'unblockCustomer' | 'requestCustomerDeletion'
  >;
  readonly audit: AuditWriter;
}

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createAdminCustomersService = (deps: AdminCustomersDeps): AdminCustomersService => {
  const { customers, installations, bookings, lifecycle, audit } = deps;

  const toRow = async (c: Entity<CustomerRaw>): Promise<AdminCustomerRow> => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`.trim(),
    phone: c.phone.e164,
    gender: c.gender,
    cityId: c.cityId,
    status: c.status,
    registeredAt: c.createdAt,
    lastActiveAt: c.lastActiveAt ?? null,
    bookingsCount: await bookings.count({ customerId: c.id }),
  });

  const require = async (id: string): Promise<Entity<CustomerRaw>> => {
    const found = await customers.findById(id);
    if (found === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return found;
  };

  const record = (
    actor: AdminActor,
    action: string,
    id: string,
    reason: string,
    before: unknown,
    after: unknown,
  ): Promise<unknown> =>
    audit.record({
      adminId: actor.adminId,
      action,
      entityType: CUSTOMER_AUDIT_ENTITY,
      entityId: id,
      before,
      after,
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

  return {
    async list({ params, status, gender, cityId, q }) {
      const text = q?.trim();
      const page = await customers.findPage(
        {
          ...(status === undefined ? {} : { status }),
          ...(gender === undefined ? {} : { gender }),
          ...(cityId === undefined ? {} : { cityId }),
          ...(text === undefined || text === ''
            ? {}
            : {
                $or: [
                  { firstName: { $regex: escapeRegex(text), $options: 'i' } },
                  { lastName: { $regex: escapeRegex(text), $options: 'i' } },
                  { 'phone.e164': { $regex: escapeRegex(text) } },
                ],
              }),
        },
        params,
        { createdAt: -1 },
      );
      return { items: await Promise.all(page.items.map(toRow)), total: page.meta.total };
    },

    async detail(id) {
      const c = await require(id);
      const devices = await installations.findMany({ customerId: c.id }, { lastSeenAt: -1 });
      return {
        ...(await toRow(c)),
        email: c.email,
        areaId: c.areaId,
        language: c.language,
        pushEnabled: c.pushEnabled,
        blockedReason: c.blockedReason ?? null,
        blockedAt: c.blockedAt ?? null,
        deletionScheduledAt: c.deletionScheduledAt ?? null,
        journeyUserId: c.id,
        devices: devices.slice(0, ADMIN_CUSTOMER_MAX_DEVICES).map((d) => ({
          app: d.app,
          platform: d.platform,
          appVersion: d.appVersion,
          lastSeenAt: d.lastSeenAt,
          pushToken: d.fcmToken !== undefined,
        })),
      };
    },

    async block({ id, reason, actor }) {
      await lifecycle.blockCustomer({ customerId: id, reason, actor });
    },
    async unblock({ id, reason, actor }) {
      await lifecycle.unblockCustomer({ customerId: id, reason, actor });
    },

    async delete({ id, reason, actor }) {
      const c = await require(id);
      const result = await lifecycle.requestCustomerDeletion({ customerId: c.id });
      await record(
        actor,
        ADMIN_CUSTOMER_AUDIT.delete,
        c.id,
        reason,
        { status: c.status },
        {
          status: 'DELETION_PENDING',
          deletionScheduledAt: result.deletionScheduledAt,
        },
      );
      return result;
    },

    async restore({ id, reason, actor }) {
      const c = await require(id);
      const restored = await customers.transition(c.id, ['DELETION_PENDING'], {
        set: { status: 'ACTIVE' },
        unset: ['deletionRequestedAt', 'deletionScheduledAt'],
      });
      if (restored === null) throw new ConflictError();
      await record(
        actor,
        ADMIN_CUSTOMER_AUDIT.restore,
        c.id,
        reason,
        { status: 'DELETION_PENDING' },
        {
          status: 'ACTIVE',
        },
      );
    },
  };
};
