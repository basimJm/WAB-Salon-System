import { ADMIN_CUSTOMER_AUDIT } from '../../constants/adminCustomers';
import { CUSTOMER_AUDIT_ENTITY } from '../../constants/accountLifecycle';
import type { Gender, Language } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { CustomerRaw } from '../../models/customer.model';
import type { NotificationRaw } from '../../models/notification.model';
import type { CustomersRepository } from '../../repositories/identity.repository';
import type { AreasRepository, CitiesRepository } from '../../repositories/locations.repository';
import type { NotificationsRepository } from '../../repositories/notifications.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../utils/errors';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AccountLifecycleService, AdminActor } from '../auth/accountLifecycle.service';
import type { CampaignView, CampaignsService } from '../campaigns/campaigns.service';
import { assertPlace } from '../locations/place';
import type { AdminReviewRow, AdminReviewsService } from '../reviews/adminReviews.service';

/** Fields an admin may correct; the phone number only changes through the customer's OTP flow. */
export interface CustomerEdit {
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  readonly email?: string | undefined;
  readonly gender?: Gender | undefined;
  readonly cityId?: string | undefined;
  readonly areaId?: string | undefined;
  readonly language?: Language | undefined;
}

export interface CustomerProfileRow {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly gender: Gender;
  readonly cityId: string;
  readonly areaId: string;
  readonly language: Language;
}

export interface CustomerNotificationRow {
  readonly id: string;
  readonly event: string;
  readonly type: string;
  readonly title: { ar: string; en: string };
  readonly body: { ar: string; en: string };
  readonly readAt: Date | null;
  readonly pushSent: boolean;
  readonly pushResult: string | null;
  readonly createdAt: Date;
}

export interface AdminCustomerExtrasService {
  /** A blocked or pending-deletion customer can be corrected too; an anonymized one cannot (409). */
  update(input: {
    customerId: string;
    patch: CustomerEdit;
    reason: string;
    actor: AdminActor;
  }): Promise<CustomerProfileRow>;
  /** Every review the customer wrote, whatever its moderation status, newest first. */
  reviews(input: {
    customerId: string;
    params: PaginationParams;
  }): Promise<{ items: AdminReviewRow[]; total: number }>;
  /** What the platform sent to the customer (the inbox, including unread ones), newest first. */
  notifications(input: {
    customerId: string;
    params: PaginationParams;
  }): Promise<{ items: CustomerNotificationRow[]; total: number }>;
  /** A push to this one customer, sent now through a SPECIFIC_USERS campaign (audited there). */
  push(input: {
    customerId: string;
    title: { ar: string; en: string };
    body: { ar: string; en: string };
    link?: string | undefined;
    reason: string;
    actor: AdminActor;
  }): Promise<CampaignView>;
  forceDelete(input: { customerId: string; reason: string; actor: AdminActor }): Promise<void>;
}

export interface AdminCustomerExtrasDeps {
  readonly customers: Pick<CustomersRepository, 'findById' | 'patch'>;
  readonly cities: Pick<CitiesRepository, 'findOne'>;
  readonly areas: Pick<AreasRepository, 'findOne'>;
  readonly reviews: Pick<AdminReviewsService, 'list'>;
  readonly notifications: Pick<NotificationsRepository, 'findPage'>;
  readonly campaigns: Pick<CampaignsService, 'create'>;
  readonly lifecycle: Pick<AccountLifecycleService, 'forceDeleteCustomer'>;
  readonly audit: AuditWriter;
}

const toProfile = (c: Entity<CustomerRaw>): CustomerProfileRow => ({
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName,
  email: c.email,
  gender: c.gender,
  cityId: c.cityId,
  areaId: c.areaId,
  language: c.language,
});

export const createAdminCustomerExtrasService = (
  deps: AdminCustomerExtrasDeps,
): AdminCustomerExtrasService => {
  const { customers, cities, areas, audit } = deps;

  const find = async (customerId: string): Promise<Entity<CustomerRaw>> => {
    const customer = await customers.findById(customerId);
    if (customer === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return customer;
  };

  return {
    async update({ customerId, patch, reason, actor }) {
      const before = await find(customerId);
      if (before.status === 'DELETED') throw new ConflictError();
      await assertPlace(
        { cities, areas },
        'body',
        patch.cityId ?? (patch.areaId === undefined ? undefined : before.cityId),
        patch.areaId,
      );
      const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      const updated = await customers.patch(customerId, { set });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      const fields = Object.keys(set) as (keyof CustomerProfileRow)[];
      const pick = (source: CustomerProfileRow): Record<string, unknown> =>
        Object.fromEntries(fields.map((field) => [field, source[field]]));
      await audit.record({
        adminId: actor.adminId,
        action: ADMIN_CUSTOMER_AUDIT.edit,
        entityType: CUSTOMER_AUDIT_ENTITY,
        entityId: customerId,
        before: pick(toProfile(before)),
        after: pick(toProfile(updated)),
        reason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      return toProfile(updated);
    },

    async reviews({ customerId, params }) {
      await find(customerId);
      return deps.reviews.list({ authorId: customerId, params });
    },

    async notifications({ customerId, params }) {
      await find(customerId);
      const page = await deps.notifications.findPage(
        { recipientType: 'CUSTOMER', recipientId: toObjectId(customerId) },
        params,
        { createdAt: -1 },
      );
      return {
        items: page.items.map((n: Entity<NotificationRaw>) => ({
          id: n.id,
          event: n.event,
          type: n.type,
          title: n.title,
          body: n.body,
          readAt: n.readAt ?? null,
          pushSent: n.pushSent,
          pushResult: n.pushResult ?? null,
          createdAt: n.createdAt,
        })),
        total: page.meta.total,
      };
    },

    async push({ customerId, title, body, link, reason, actor }) {
      const customer = await find(customerId);
      // Campaigns reach ACTIVE accounts only; say so instead of sending to nobody.
      if (customer.status !== 'ACTIVE') {
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      }
      return deps.campaigns.create({
        data: {
          title,
          body,
          app: 'CUSTOMER',
          audience: { kind: 'SPECIFIC_USERS', customerIds: [customerId] },
          link,
        },
        reason,
        actor,
      });
    },

    async forceDelete({ customerId, reason, actor }) {
      await deps.lifecycle.forceDeleteCustomer({ customerId, reason, actor });
    },
  };
};
