import type { AlertsService } from '../alerts/alerts.service';
import {
  SALON_DELETION_AUDIT,
  type SalonDeletionDecision,
} from '../../constants/adminSalonInsights';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { SalonRaw } from '../../models/salon.model';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { BookingConflict } from './hoursService';
import type { SalonStateNotifier, SalonStateService } from './salonState.service';

export interface SalonDeletionService {
  /**
   * The owner's deletion request (`salon.deletionRequestedAt`, BUSINESS_DOMAIN §5.15) gets an admin
   * decision. APPROVE: only when no PENDING/APPROVED booking is left (409 with the list), then the
   * salon goes OFFLINE and waits for the purge. REJECT: the request is cleared and the owner told.
   */
  decide(input: {
    salonId: string;
    decision: SalonDeletionDecision;
    reason: string;
    actor: AdminActor;
  }): Promise<{ decision: SalonDeletionDecision }>;
  /**
   * The owner asks WAB to delete the salon (M25, store policy): stamps `deletionRequestedAt` once
   * and raises an admin alert; asking again while a request is open changes nothing.
   */
  request(input: {
    salonId: string;
    memberId: string;
    note?: string | undefined;
  }): Promise<{ requestedAt: Date }>;
}

export interface SalonDeletionDeps {
  readonly salons: Pick<SalonsRepository, 'findById' | 'patch'>;
  readonly state: Pick<SalonStateService, 'setOffline'>;
  readonly bookings: { check(input: { salonId: string }): Promise<BookingConflict[]> };
  readonly audit: AuditWriter;
  readonly notifier: SalonStateNotifier;
  readonly logger: Logger;
  readonly now?: () => Date;
  /** Admin alert for a new request; without it the request is only stamped. */
  readonly alerts?: Pick<AlertsService, 'raise'>;
}

export const createSalonDeletionService = (deps: SalonDeletionDeps): SalonDeletionService => {
  const { salons, state, bookings, audit, notifier, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  return {
    async request({ salonId, memberId, note }) {
      const salon = await salons.findById(salonId);
      if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      if (salon.deletionRequestedAt !== undefined)
        return { requestedAt: salon.deletionRequestedAt };
      const requestedAt = now();
      await salons.patch(salonId, { set: { deletionRequestedAt: requestedAt } });
      await deps.alerts?.raise({
        kind: 'SALON_DELETION_REQUEST',
        severity: 'WARNING',
        dedupeKey: `salon-deletion:${salonId}:${String(requestedAt.getTime())}`,
        entityType: 'SALON',
        entityId: salonId,
        data: { salonName: salon.name, memberId, ...(note === undefined ? {} : { note }) },
      });
      return { requestedAt };
    },

    async decide({ salonId, decision, reason, actor }) {
      const salon: Entity<SalonRaw> | null = await salons.findById(salonId);
      if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      // Nothing to decide, or already decided.
      if (salon.deletionRequestedAt === undefined || salon.deletionApprovedAt !== undefined) {
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      }
      if (decision === 'APPROVE') {
        const open = await bookings.check({ salonId });
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
        // An already offline salon stays as it is; otherwise the usual offline change (audit + notice).
        if (salon.state === 'LIVE' || salon.state === 'APPROVED_INCOMPLETE') {
          await state.setOffline({ salonId, reason, actor });
        }
        await salons.patch(salonId, { set: { deletionApprovedAt: now() } });
      } else {
        await salons.patch(salonId, { set: {}, unset: ['deletionRequestedAt'] });
        try {
          await notifier.changed({ salonId, event: 'salon.deletion_rejected', reason });
        } catch (error) {
          logger.warn({ salonId, err: error }, 'deletion decision notice failed');
        }
      }
      await audit.record({
        adminId: actor.adminId,
        action: SALON_DELETION_AUDIT.action,
        entityType: SALON_DELETION_AUDIT.entityType,
        entityId: salonId,
        before: { deletionRequestedAt: salon.deletionRequestedAt },
        after: { decision },
        reason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      return { decision };
    },
  };
};
