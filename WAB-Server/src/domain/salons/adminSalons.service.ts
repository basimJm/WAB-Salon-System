import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { Gender } from '../../constants/enums';
import type { SalonState } from '../../constants/salon';
import type { SubscriptionStatus } from '../../constants/subscriptions';
import type { SalonRaw } from '../../models/salon.model';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { SubscriptionsRepository } from '../../repositories/subscriptions.repository';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { BookingConflict } from './hoursService';
import type { SalonStateNotifier, SalonStateService } from './salonState.service';

export interface AdminSalonRow {
  readonly id: string;
  readonly name: string;
  readonly gender: Gender;
  readonly state: SalonState;
  readonly cityId: string | null;
  readonly areaId: string | null;
  readonly rating: { avg: number; count: number };
  readonly subscriptionStatus: SubscriptionStatus | null;
  readonly createdAt: Date;
}

export interface AdminSalonDetail extends AdminSalonRow {
  readonly description: string | null;
  readonly phone: string | null;
  readonly completeness: { missing: string[]; isComplete: boolean };
  readonly offline: { reason: string; at: Date } | null;
  readonly owner: { id: string; firstName: string; lastName: string; phone: string } | null;
  readonly subscription: {
    status: SubscriptionStatus;
    trialEndsAt: Date;
    currentPeriodEnd: Date | null;
  } | null;
}

export interface SalonListFilter {
  readonly state?: SalonState | undefined;
  readonly gender?: Gender | undefined;
  readonly cityId?: string | undefined;
  /** Part of the salon name. */
  readonly q?: string | undefined;
}

export interface AdminSalonsService {
  list(input: {
    filter: SalonListFilter;
    params: PaginationParams;
  }): Promise<{ items: AdminSalonRow[]; meta: PaginationMeta }>;
  detail(salonId: string): Promise<AdminSalonDetail>;
  /**
   * Admin only (the gender is fixed once approved). The salon's services belong to the old
   * audience's catalog, so they are switched off; bride flags go with a women's salon.
   */
  changeGender(input: {
    salonId: string;
    gender: Gender;
    reason: string;
    actor: AdminActor;
  }): Promise<AdminSalonDetail>;
}

export interface AdminSalonsDeps {
  readonly salons: SalonsRepository;
  readonly members: Pick<MembersRepository, 'findOne' | 'clearBrideQualification'>;
  readonly subscriptions: Pick<SubscriptionsRepository, 'findMany' | 'findOne'>;
  readonly salonServices: Pick<SalonServicesRepository, 'deactivateAll'>;
  readonly state: Pick<SalonStateService, 'recompute'>;
  readonly audit: AuditWriter;
  readonly notifier: SalonStateNotifier;
  readonly logger: Logger;
  /** Upcoming bookings of the salon; the gender cannot change while any exist. */
  readonly bookings?: { check(input: { salonId: string }): Promise<BookingConflict[]> };
}

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createAdminSalonsService = (deps: AdminSalonsDeps): AdminSalonsService => {
  const { salons, members, subscriptions, salonServices, state, audit, notifier, logger } = deps;
  const { bookings } = deps;

  const row = (s: Entity<SalonRaw>, status: SubscriptionStatus | null): AdminSalonRow => ({
    id: s.id,
    name: s.name,
    gender: s.gender,
    state: s.state,
    cityId: s.cityId ?? null,
    areaId: s.areaId ?? null,
    rating: s.rating,
    subscriptionStatus: status,
    createdAt: s.createdAt,
  });

  const find = async (salonId: string): Promise<Entity<SalonRaw>> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon;
  };

  const detail = async (salonId: string): Promise<AdminSalonDetail> => {
    const salon = await find(salonId);
    const [owner, subscription] = await Promise.all([
      members.findOne({ salonId, role: 'OWNER' }),
      subscriptions.findOne({ salonId }),
    ]);
    return {
      ...row(salon, subscription?.status ?? null),
      description: salon.description ?? null,
      phone: salon.phone ?? null,
      completeness: salon.completeness,
      offline:
        salon.offline === undefined ? null : { reason: salon.offline.reason, at: salon.offline.at },
      owner:
        owner === null
          ? null
          : {
              id: owner.id,
              firstName: owner.firstName,
              lastName: owner.lastName,
              phone: owner.phone,
            },
      subscription:
        subscription === null
          ? null
          : {
              status: subscription.status,
              trialEndsAt: subscription.trialEndsAt,
              currentPeriodEnd: subscription.currentPeriodEnd ?? null,
            },
    };
  };

  return {
    async list({ filter, params }) {
      const page = await salons.findPage(
        {
          ...(filter.state === undefined ? {} : { state: filter.state }),
          ...(filter.gender === undefined ? {} : { gender: filter.gender }),
          ...(filter.cityId === undefined ? {} : { cityId: filter.cityId }),
          ...(filter.q === undefined || filter.q === ''
            ? {}
            : { name: { $regex: escapeRegex(filter.q), $options: 'i' } }),
        },
        params,
        { createdAt: -1 },
      );
      const ids = page.items.map((s) => s.id);
      const subs = ids.length === 0 ? [] : await subscriptions.findMany({ salonId: { $in: ids } });
      const bySalon = new Map(subs.map((s) => [s.salonId, s.status]));
      return {
        items: page.items.map((s) => row(s, bySalon.get(s.id) ?? null)),
        meta: page.meta,
      };
    },

    detail,

    async changeGender({ salonId, gender, reason, actor }) {
      const before = await find(salonId);
      if (before.gender === gender) {
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      }
      const open = (await bookings?.check({ salonId })) ?? [];
      if (open.length > 0) {
        throw new ConflictError({
          code: ERROR_CODES.SCHEDULE_CONFLICT,
          details: open.map((c) => ({
            field: c.bookingId,
            code: ERROR_CODES.SCHEDULE_CONFLICT,
            messageKey: errorMessageKey(ERROR_CODES.SCHEDULE_CONFLICT),
          })),
        });
      }
      const updated = await salons.patch(salonId, { set: { gender } });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      await salonServices.deactivateAll(salonId);
      if (gender === 'MALE') await members.clearBrideQualification(salonId);
      await state.recompute(salonId);
      await audit.record({
        adminId: actor.adminId,
        action: 'SALON_CHANGE_GENDER',
        entityType: 'salon',
        entityId: salonId,
        before: { gender: before.gender },
        after: { gender },
        reason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      try {
        await notifier.changed({ salonId, event: 'salon.gender_changed', reason });
      } catch (error) {
        logger.error({ err: error, salonId }, 'salon gender notification failed');
      }
      return detail(salonId);
    },
  };
};
