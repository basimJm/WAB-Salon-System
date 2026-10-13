import { ERROR_CODES } from '../../constants/errorCodes';
import { LICENSE_URL_TTL_SEC, type SalonState } from '../../constants/salon';
import { MS_PER_DAY } from '../../constants/time';
import type { SalonRaw } from '../../models/salon.model';
import type { StorageProvider } from '../../providers/storage';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { SubscriptionsRepository } from '../../repositories/subscriptions.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, NotFoundError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { SettingsService } from '../settings';

const PENDING: SalonState = 'APPLICATION_PENDING';

export type ApplicationDecision = 'approved' | 'rejected';

/** Tells the owner how the review ended; the real push/email arrives with the notification core. */
export interface ApplicationNotifier {
  reviewed(input: {
    salonId: string;
    decision: ApplicationDecision;
    reason: string;
  }): Promise<void>;
}

export interface ApplicationRow {
  readonly id: string;
  readonly name: string;
  readonly gender: SalonRaw['gender'];
  readonly state: SalonState;
  readonly cityId: string | null;
  readonly owner: { id: string; firstName: string; lastName: string; phone: string } | null;
  readonly submittedAt: Date;
  readonly resubmissionCount: number;
  readonly rejectionReason: string | null;
}

export interface ApplicationDetail extends ApplicationRow {
  readonly description: string | null;
  readonly areaId: string | null;
  /** Short-lived signed URLs of the private license documents. */
  readonly documentUrls: readonly string[];
}

export interface SalonReviewService {
  list(input: {
    state?: SalonState | undefined;
    params: PaginationParams;
  }): Promise<{ items: ApplicationRow[]; total: number }>;
  detail(salonId: string): Promise<ApplicationDetail>;
  approve(input: { salonId: string; reason: string; actor: AdminActor }): Promise<ApplicationRow>;
  reject(input: { salonId: string; reason: string; actor: AdminActor }): Promise<ApplicationRow>;
}

export interface SalonReviewDeps {
  readonly salons: SalonsRepository;
  readonly members: Pick<MembersRepository, 'findMany' | 'findOne'>;
  readonly subscriptions: Pick<SubscriptionsRepository, 'create'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly storage: Pick<StorageProvider, 'getSignedUrl'>;
  readonly audit: AuditWriter;
  readonly notifier: ApplicationNotifier;
  readonly logger: Logger;
  readonly now?: () => Date;
}

type Owner = NonNullable<ApplicationRow['owner']>;

export const createSalonReviewService = (deps: SalonReviewDeps): SalonReviewService => {
  const { salons, members, subscriptions, settings, storage, audit, notifier, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const row = (salon: Entity<SalonRaw>, owner: Owner | null): ApplicationRow => ({
    id: salon.id,
    name: salon.name,
    gender: salon.gender,
    state: salon.state,
    cityId: salon.cityId ?? null,
    owner,
    submittedAt: salon.application.submittedAt,
    resubmissionCount: salon.application.resubmissionCount,
    rejectionReason: salon.application.rejectionReason ?? null,
  });

  const toOwner = (m: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Owner => ({ id: m.id, firstName: m.firstName, lastName: m.lastName, phone: m.phone });

  const find = async (salonId: string): Promise<Entity<SalonRaw>> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon;
  };

  /** Pending → approved/rejected in one atomic step; anything else is not reviewable. */
  const decide = async (
    decision: ApplicationDecision,
    { salonId, reason, actor }: { salonId: string; reason: string; actor: AdminActor },
  ): Promise<ApplicationRow> => {
    const before = await find(salonId);
    const at = now();
    const state: SalonState =
      decision === 'approved' ? 'APPROVED_INCOMPLETE' : 'APPLICATION_REJECTED';
    const updated = await salons.transition(salonId, PENDING, {
      state,
      application: {
        ...before.application,
        reviewedAt: at,
        reviewedBy: toObjectId(actor.adminId),
        ...(decision === 'rejected' ? { rejectionReason: reason } : {}),
      },
    });
    if (updated === null) throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
    if (decision === 'approved') {
      const trialDays = await settings.get('subscription.trialDays');
      try {
        await subscriptions.create({
          salonId: toObjectId(salonId),
          status: 'TRIAL',
          trialEndsAt: new Date(at.getTime() + trialDays * MS_PER_DAY),
          payments: [],
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
    await audit.record({
      adminId: actor.adminId,
      action: decision === 'approved' ? 'SALON_APPLICATION_APPROVE' : 'SALON_APPLICATION_REJECT',
      entityType: 'salon',
      entityId: salonId,
      before: { state: before.state },
      after: { state },
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    try {
      await notifier.reviewed({ salonId, decision, reason });
    } catch (error) {
      // The decision stands; a failed message must not undo or hide it.
      logger.error({ err: error, salonId, decision }, 'application result notification failed');
    }
    const owner = await members.findOne({ salonId, role: 'OWNER' });
    return row(updated, owner === null ? null : toOwner(owner));
  };

  return {
    async list({ state = PENDING, params }) {
      const page = await salons.findPage({ state }, params, { 'application.submittedAt': 1 });
      const owners =
        page.items.length === 0
          ? []
          : await members.findMany({
              salonId: { $in: page.items.map((s) => s.id) },
              role: 'OWNER',
            });
      const bySalon = new Map(owners.map((o) => [o.salonId, toOwner(o)]));
      return {
        items: page.items.map((s) => row(s, bySalon.get(s.id) ?? null)),
        total: page.meta.total,
      };
    },

    async detail(salonId) {
      const salon = await find(salonId);
      const owner = await members.findOne({ salonId, role: 'OWNER' });
      const documentUrls = await Promise.all(
        salon.application.documentKeys.map((key) =>
          storage.getSignedUrl({ key, expiresInSec: LICENSE_URL_TTL_SEC }),
        ),
      );
      return {
        ...row(salon, owner === null ? null : toOwner(owner)),
        description: salon.description ?? null,
        areaId: salon.areaId ?? null,
        documentUrls,
      };
    },

    approve: (input) => decide('approved', input),
    reject: (input) => decide('rejected', input),
  };
};
