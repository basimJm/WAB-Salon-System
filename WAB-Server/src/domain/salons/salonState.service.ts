import { ERROR_CODES } from '../../constants/errorCodes';
import type { SalonState, SalonStateEvent } from '../../constants/salon';
import type { SalonRaw } from '../../models/salon.model';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, NotFoundError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import { computeMissing } from './completeness';

/** Counts that live outside the salon document. */
export interface CompletenessFacts {
  activeServiceCount(salonId: string): Promise<number>;
  qualifiedStaffCount(salonId: string): Promise<number>;
}

/** Tells the owner about a salon state change; failures are logged, never block the change. */
export interface SalonStateNotifier {
  changed(input: { salonId: string; event: SalonStateEvent; reason?: string }): Promise<void>;
}

export interface SalonStatus {
  readonly salonId: string;
  readonly state: SalonState;
  readonly missing: readonly string[];
  readonly isComplete: boolean;
}

export interface SalonStateService {
  /** Recomputes `completeness` after a profile write and promotes `APPROVED_INCOMPLETE` to `LIVE`. */
  recompute(salonId: string): Promise<SalonStatus>;
  /** Missing items and the resulting state for a salon, without saving (used on approval). */
  evaluate(salon: Entity<SalonRaw>): Promise<{ missing: string[]; isComplete: boolean }>;
  /** Admin: takes a visible or incomplete salon off the platform (reason + audit). */
  setOffline(input: { salonId: string; reason: string; actor: AdminActor }): Promise<SalonStatus>;
  /** Admin: brings an offline salon back as `LIVE` if complete, else `APPROVED_INCOMPLETE`. */
  setOnline(input: { salonId: string; reason: string; actor: AdminActor }): Promise<SalonStatus>;
}

export interface SalonStateDeps {
  readonly salons: SalonsRepository;
  readonly facts: CompletenessFacts;
  readonly audit: AuditWriter;
  readonly notifier: SalonStateNotifier;
  readonly logger: Logger;
  readonly now?: () => Date;
}

/** Staff that can take bookings: active, provides services, has a service and a working day. */
export const createStaffFacts = (
  members: Pick<MembersRepository, 'findMany'>,
  activeServiceCount: CompletenessFacts['activeServiceCount'],
): CompletenessFacts => ({
  activeServiceCount,
  async qualifiedStaffCount(salonId) {
    const staff = await members.findMany({ salonId, active: true, providesServices: true });
    return staff.filter(
      (m) => (m.staff?.serviceIds.length ?? 0) > 0 && (m.staff?.workingDays.length ?? 0) > 0,
    ).length;
  },
});

const toStatus = (salon: Entity<SalonRaw>): SalonStatus => ({
  salonId: salon.id,
  state: salon.state,
  missing: salon.completeness.missing,
  isComplete: salon.completeness.isComplete,
});

export const createSalonStateService = (deps: SalonStateDeps): SalonStateService => {
  const { salons, facts, audit, notifier, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const find = async (salonId: string): Promise<Entity<SalonRaw>> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon;
  };

  const evaluate: SalonStateService['evaluate'] = async (salon) => {
    const [activeServices, qualifiedStaff] = await Promise.all([
      facts.activeServiceCount(salon.id),
      facts.qualifiedStaffCount(salon.id),
    ]);
    const missing = computeMissing({ ...salon, activeServices, qualifiedStaff });
    return { missing, isComplete: missing.length === 0 };
  };

  const notify = async (
    salonId: string,
    event: SalonStateEvent,
    reason?: string,
  ): Promise<void> => {
    try {
      await notifier.changed({ salonId, event, ...(reason === undefined ? {} : { reason }) });
    } catch (error) {
      logger.error({ err: error, salonId, event }, 'salon state notification failed');
    }
  };

  const adminChange = async (
    kind: 'offline' | 'online',
    { salonId, reason, actor }: { salonId: string; reason: string; actor: AdminActor },
  ): Promise<SalonStatus> => {
    const before = await find(salonId);
    const completeness = await evaluate(before);
    const from: SalonState[] = kind === 'offline' ? ['LIVE', 'APPROVED_INCOMPLETE'] : ['OFFLINE'];
    const next: SalonState =
      kind === 'offline' ? 'OFFLINE' : completeness.isComplete ? 'LIVE' : 'APPROVED_INCOMPLETE';
    const updated = await salons.transition(salonId, from, {
      state: next,
      completeness,
      ...(kind === 'offline'
        ? { offline: { reason, at: now(), by: toObjectId(actor.adminId) } }
        : {}),
    });
    if (updated === null) throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
    await audit.record({
      adminId: actor.adminId,
      action: kind === 'offline' ? 'SALON_SET_OFFLINE' : 'SALON_SET_ONLINE',
      entityType: 'salon',
      entityId: salonId,
      before: { state: before.state },
      after: { state: next },
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    await notify(salonId, kind === 'offline' ? 'salon.offline' : 'salon.online', reason);
    return toStatus(updated);
  };

  return {
    evaluate,

    async recompute(salonId) {
      const salon = await find(salonId);
      const completeness = await evaluate(salon);
      const promote = salon.state === 'APPROVED_INCOMPLETE' && completeness.isComplete;
      const wasBookable = salon.state === 'LIVE' && salon.completeness.isComplete;
      const updated = promote
        ? await salons.transition(salonId, 'APPROVED_INCOMPLETE', { state: 'LIVE', completeness })
        : await salons.updateById(salonId, { completeness });
      // A concurrent change of state (admin set it offline) wins: report what is stored now.
      const current = updated ?? (await find(salonId));
      if (promote && updated !== null) await notify(salonId, 'salon.live');
      if (wasBookable && !completeness.isComplete && salon.state === 'LIVE') {
        await notify(salonId, 'salon.not_bookable');
      }
      return toStatus(current);
    },

    setOffline: (input) => adminChange('offline', input),
    setOnline: (input) => adminChange('online', input),
  };
};
