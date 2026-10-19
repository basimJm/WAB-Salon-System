import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { Gender } from '../../constants/enums';
import type { SalonState } from '../../constants/salon';
import type { SubscriptionStatus } from '../../constants/subscriptions';
import { SALON_RECENT_DAYS } from '../../constants/adminSalonInsights';
import { MS_PER_DAY } from '../../constants/time';
import type { SalonRaw } from '../../models/salon.model';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { PlacementsRepository } from '../../repositories/placements.repository';
import { toObjectId } from '../../utils/database/ids';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { effectivePermissions } from '../permissions/permissions';
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
  /** In an active "Recommended" placement right now. */
  readonly recommended: boolean;
  /** Bookings created in the last `SALON_RECENT_DAYS` days. */
  readonly bookings30d: number;
  /** The owner asked to delete the salon and no decision was made yet. */
  readonly deletionRequestedAt: Date | null;
  readonly createdAt: Date;
}

export interface AdminSalonDetail extends AdminSalonRow {
  readonly deletionApprovedAt: Date | null;
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
  readonly subscription?: SubscriptionStatus | undefined;
  /** `true` = only salons in an active placement now, `false` = only the others. */
  readonly recommended?: boolean | undefined;
  /** `true` = only salons with a pending deletion request. */
  readonly deletionRequested?: boolean | undefined;
}

export interface AdminSalonMember {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly role: string;
  readonly active: boolean;
  readonly providesServices: boolean;
  /** What the member can do (the owner has everything). */
  readonly permissions: readonly string[];
}

export interface AdminSalonsService {
  /** Every member of a salon, active or not, owner first. */
  members(salonId: string): Promise<AdminSalonMember[]>;
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
  readonly members: Pick<MembersRepository, 'findOne' | 'findMany' | 'clearBrideQualification'>;
  readonly subscriptions: Pick<SubscriptionsRepository, 'findMany' | 'findOne'>;
  readonly salonServices: Pick<SalonServicesRepository, 'deactivateAll'>;
  readonly state: Pick<SalonStateService, 'recompute'>;
  readonly audit: AuditWriter;
  readonly notifier: SalonStateNotifier;
  readonly logger: Logger;
  /** Upcoming bookings of the salon; the gender cannot change while any exist. */
  readonly bookings?: { check(input: { salonId: string }): Promise<BookingConflict[]> };
  /** Without these the list shows no recommended flag and 0 recent bookings. */
  readonly placements?: Pick<PlacementsRepository, 'findMany'>;
  readonly bookingCounts?: Pick<BookingsRepository, 'countBy'>;
  readonly now?: () => Date;
}

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createAdminSalonsService = (deps: AdminSalonsDeps): AdminSalonsService => {
  const { salons, members, subscriptions, salonServices, state, audit, notifier, logger } = deps;
  const { bookings } = deps;
  const now = deps.now ?? ((): Date => new Date());

  interface Extras {
    readonly recommended: ReadonlySet<string>;
    readonly bookings30d: Readonly<Record<string, number>>;
  }

  /** Salons in an active placement now, and the bookings created in the last 30 days, for these ids. */
  const extrasFor = async (ids: readonly string[]): Promise<Extras> => {
    if (ids.length === 0) return { recommended: new Set(), bookings30d: {} };
    const at = now();
    const [placed, counts] = await Promise.all([
      deps.placements?.findMany({
        salonId: { $in: ids },
        startAt: { $lte: at },
        endAt: { $gt: at },
      }) ?? Promise.resolve([]),
      deps.bookingCounts?.countBy(
        {
          salonId: { $in: ids.map(toObjectId) },
          createdAt: { $gte: new Date(at.getTime() - SALON_RECENT_DAYS * MS_PER_DAY) },
        },
        'salonId',
      ) ?? Promise.resolve({}),
    ]);
    return { recommended: new Set(placed.map((p) => p.salonId)), bookings30d: counts };
  };

  const row = (
    s: Entity<SalonRaw>,
    status: SubscriptionStatus | null,
    extras: Extras,
  ): AdminSalonRow => ({
    id: s.id,
    name: s.name,
    gender: s.gender,
    state: s.state,
    cityId: s.cityId ?? null,
    areaId: s.areaId ?? null,
    rating: s.rating,
    subscriptionStatus: status,
    recommended: extras.recommended.has(s.id),
    bookings30d: extras.bookings30d[s.id] ?? 0,
    deletionRequestedAt: s.deletionRequestedAt ?? null,
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
      ...row(salon, subscription?.status ?? null, await extrasFor([salonId])),
      deletionApprovedAt: salon.deletionApprovedAt ?? null,
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
    async members(salonId) {
      await find(salonId);
      const team = await members.findMany({ salonId }, { createdAt: 1 });
      return team
        .map((member) => ({
          id: member.id,
          name: `${member.firstName} ${member.lastName}`.trim(),
          phone: member.phone,
          role: member.role,
          active: member.active,
          providesServices: member.providesServices,
          permissions: effectivePermissions(member),
        }))
        .sort((a, b) => Number(b.role === 'OWNER') - Number(a.role === 'OWNER'));
    },

    async list({ filter, params }) {
      // Filters that depend on other collections become an id list on the salons query.
      const include: Set<string>[] = [];
      const exclude = new Set<string>();
      if (filter.subscription !== undefined) {
        const subs = await subscriptions.findMany({ status: filter.subscription });
        include.push(new Set(subs.map((sub) => sub.salonId)));
      }
      if (filter.recommended !== undefined) {
        const at = now();
        const placed = await (deps.placements?.findMany({
          startAt: { $lte: at },
          endAt: { $gt: at },
        }) ?? Promise.resolve([]));
        const ids = new Set(placed.map((p) => p.salonId));
        if (filter.recommended) include.push(ids);
        else ids.forEach((id) => exclude.add(id));
      }
      const included = include.reduce<Set<string> | null>(
        (all, next) => (all === null ? next : new Set([...all].filter((id) => next.has(id)))),
        null,
      );
      const idFilter =
        included === null && exclude.size === 0
          ? {}
          : {
              _id: {
                ...(included === null
                  ? {}
                  : { $in: [...included].filter((id) => !exclude.has(id)) }),
                ...(exclude.size === 0 ? {} : { $nin: [...exclude] }),
              },
            };
      const page = await salons.findPage(
        {
          ...(filter.state === undefined ? {} : { state: filter.state }),
          ...(filter.gender === undefined ? {} : { gender: filter.gender }),
          ...(filter.cityId === undefined ? {} : { cityId: filter.cityId }),
          ...(filter.q === undefined || filter.q === ''
            ? {}
            : { name: { $regex: escapeRegex(filter.q), $options: 'i' } }),
          ...(filter.deletionRequested === true ? { deletionRequestedAt: { $exists: true } } : {}),
          ...idFilter,
        },
        params,
        { createdAt: -1 },
      );
      const ids = page.items.map((s) => s.id);
      const [subs, extras] = await Promise.all([
        ids.length === 0 ? [] : subscriptions.findMany({ salonId: { $in: ids } }),
        extrasFor(ids),
      ]);
      const bySalon = new Map(subs.map((s) => [s.salonId, s.status]));
      return {
        items: page.items.map((s) => row(s, bySalon.get(s.id) ?? null, extras)),
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
