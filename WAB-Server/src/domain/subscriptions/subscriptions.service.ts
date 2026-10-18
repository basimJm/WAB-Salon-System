import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import {
  SUBSCRIPTION_AUDIT,
  SUBSCRIPTION_BATCH_SIZE,
  type SubscriptionStatus,
} from '../../constants/subscriptions';
import { MS_PER_DAY } from '../../constants/time';
import type { SubscriptionRaw } from '../../models/subscription.model';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { SubscriptionsRepository } from '../../repositories/subscriptions.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { SettingsService } from '../settings';

/** A recorded payment as read back (ids as strings). */
export type PaymentRow = Entity<SubscriptionRaw>['payments'][number];

export interface SubscriptionView {
  readonly salonId: string;
  readonly salonName: string;
  readonly status: SubscriptionStatus;
  readonly trialEndsAt: Date;
  readonly currentPeriodEnd: Date | null;
  /** The date the salon's access ends: the paid period if any, else the trial. */
  readonly endsAt: Date;
  /** Whole days left (rounded up), negative once it has ended. */
  readonly daysRemaining: number;
  readonly lastPayment: PaymentRow | null;
  readonly payments: readonly PaymentRow[];
}

/** A subscription whose end needs attention (alert at T−7 and on expiry; the admin decides Offline). */
export interface SubscriptionAlert {
  readonly salonId: string;
  readonly subscriptionId: string;
  readonly status: SubscriptionStatus;
  readonly endsAt: Date;
}

export interface SubscriptionsService {
  /** Admin: records a payment made outside the app; the salon becomes ACTIVE and its period is extended. */
  recordPayment(input: {
    salonId: string;
    /** Integer fils. */
    amount: number;
    paidAt: Date;
    periodFrom: Date;
    periodTo: Date;
    method: string;
    reference: string;
    note?: string | undefined;
    actor: AdminActor;
  }): Promise<SubscriptionView>;
  get(salonId: string): Promise<SubscriptionView>;
  list(input: {
    params: PaginationParams;
    status?: SubscriptionStatus | undefined;
    /** Only subscriptions ending within this many days (not yet ended). */
    endingInDays?: number | undefined;
  }): Promise<{ items: SubscriptionView[]; total: number }>;
  /**
   * Job (daily): TRIAL past its end without a paid period, and ACTIVE past its paid period, become
   * EXPIRED (BUSINESS_DOMAIN.md §5.13). Putting the salon Offline stays the admin's decision.
   */
  expireDue(): Promise<SubscriptionAlert[]>;
  /** Job: subscriptions ending within `subscription.warnDaysBefore` days that were not warned yet. */
  endingSoon(): Promise<SubscriptionAlert[]>;
}

export const createSubscriptionsService = (deps: {
  readonly subscriptions: SubscriptionsRepository;
  readonly salons: Pick<SalonsRepository, 'findById' | 'findMany'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly audit: AuditWriter;
  readonly now?: () => Date;
}): SubscriptionsService => {
  const { subscriptions, salons, settings, audit } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const endOf = (s: Entity<SubscriptionRaw>): Date => {
    const trial = s.trialEndsAt;
    const paid = s.currentPeriodEnd;
    // An active subscription ends with its paid period; a trial with its trial date.
    if (s.status === 'TRIAL') return trial;
    return paid ?? trial;
  };

  const view = (s: Entity<SubscriptionRaw>, salonName: string): SubscriptionView => {
    const endsAt = endOf(s);
    return {
      salonId: s.salonId,
      salonName,
      status: s.status,
      trialEndsAt: s.trialEndsAt,
      currentPeriodEnd: s.currentPeriodEnd ?? null,
      endsAt,
      daysRemaining: Math.ceil((endsAt.getTime() - now().getTime()) / MS_PER_DAY),
      lastPayment: s.payments.at(-1) ?? null,
      payments: s.payments,
    };
  };

  const names = async (rows: readonly Entity<SubscriptionRaw>[]): Promise<Map<string, string>> => {
    if (rows.length === 0) return new Map();
    const found = await salons.findMany({ _id: { $in: rows.map((r) => r.salonId) } });
    return new Map(found.map((s) => [s.id, s.name]));
  };

  const invalid = (field: string): ValidationError =>
    new ValidationError({
      code: ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field,
          code: ERROR_CODES.VALIDATION_ERROR,
          messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
        },
      ],
    });

  const requireSubscription = async (
    salonId: string,
  ): Promise<{ sub: Entity<SubscriptionRaw>; name: string }> => {
    const [sub, salon] = await Promise.all([
      subscriptions.findOne({ salonId }),
      salons.findById(salonId),
    ]);
    if (sub === null || salon === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return { sub, name: salon.name };
  };

  return {
    async recordPayment({
      salonId,
      amount,
      paidAt,
      periodFrom,
      periodTo,
      method,
      reference,
      note,
      actor,
    }) {
      const { sub, name } = await requireSubscription(salonId);
      if (!Number.isSafeInteger(amount) || amount <= 0) throw invalid('amount');
      if (periodTo <= periodFrom) throw invalid('periodTo');
      if (paidAt > now()) throw invalid('paidAt');
      // The same bank reference recorded twice is a double entry, not a second payment.
      if (sub.payments.some((p) => p.reference === reference)) {
        throw new ConflictError({ code: ERROR_CODES.ALREADY_HANDLED });
      }
      const updated = await subscriptions.addPayment(salonId, {
        amount,
        paidAt,
        periodFrom,
        periodTo,
        method,
        reference,
        ...(note === undefined ? {} : { note }),
        recordedBy: toObjectId(actor.adminId),
      });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      await audit.record({
        adminId: actor.adminId,
        action: SUBSCRIPTION_AUDIT.payment,
        entityType: SUBSCRIPTION_AUDIT.entityType,
        entityId: updated.id,
        before: {
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
        },
        after: {
          status: updated.status,
          currentPeriodEnd: updated.currentPeriodEnd?.toISOString() ?? null,
          amount,
          reference,
        },
        reason: note ?? `${method} ${reference}`,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      return view(updated, name);
    },

    async get(salonId) {
      const { sub, name } = await requireSubscription(salonId);
      return view(sub, name);
    },

    async list({ params, status, endingInDays }) {
      const page = await subscriptions.findPage(status === undefined ? {} : { status }, params, {
        trialEndsAt: 1,
      });
      const nameOf = await names(page.items);
      let items = page.items.map((s) => view(s, nameOf.get(s.salonId) ?? ''));
      if (endingInDays !== undefined) {
        items = items.filter(
          (s) => s.status !== 'EXPIRED' && s.daysRemaining >= 0 && s.daysRemaining <= endingInDays,
        );
      }
      return { items, total: endingInDays === undefined ? page.meta.total : items.length };
    },

    async expireDue() {
      const at = now();
      const expired: SubscriptionAlert[] = [];
      const candidates = await subscriptions.findMany({ status: { $in: ['TRIAL', 'ACTIVE'] } });
      for (const s of candidates.slice(0, SUBSCRIPTION_BATCH_SIZE * 10)) {
        const endsAt = endOf(s);
        if (endsAt >= at) continue;
        // A payment recorded meanwhile changes the status, so this update then matches nothing.
        const done = await subscriptions.expire(s.id, s.status);
        if (done !== null) {
          expired.push({ salonId: s.salonId, subscriptionId: s.id, status: 'EXPIRED', endsAt });
        }
      }
      return expired;
    },

    async endingSoon() {
      const days = await settings.get('subscription.warnDaysBefore');
      const at = now();
      const horizon = new Date(at.getTime() + days * MS_PER_DAY);
      const found = await subscriptions.findMany({ status: { $in: ['TRIAL', 'ACTIVE'] } });
      const alerts: SubscriptionAlert[] = [];
      for (const s of found) {
        const endsAt = endOf(s);
        if (endsAt < at || endsAt > horizon) continue;
        if (s.warnedEnd !== undefined && s.warnedEnd.getTime() === endsAt.getTime()) continue;
        await subscriptions.markWarned(s.id, endsAt);
        alerts.push({ salonId: s.salonId, subscriptionId: s.id, status: s.status, endsAt });
      }
      return alerts;
    },
  };
};
