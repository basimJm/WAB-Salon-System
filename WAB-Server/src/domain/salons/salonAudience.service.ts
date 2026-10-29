import type { Audience, BusinessType } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { BusinessRuleError, NotFoundError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { AlertsService } from '../alerts/alerts.service';
import { isWidening } from '../businessTypes/rules';
import type { SalonStateNotifier } from './salonState.service';

export interface SalonAudienceService {
  /**
   * The owner widens a SALON from MALE or FEMALE to BOTH (§5.19), instantly: everything the salon
   * offers still fits. Narrowing, a clinic or the same audience is `AUDIENCE_CHANGE_NOT_ALLOWED`
   * (narrowing is the admin's, with a reason).
   */
  widen(input: {
    salonId: string;
    memberId: string;
    audience: Audience;
  }): Promise<{ businessType: BusinessType; audience: Audience }>;
}

export interface SalonAudienceDeps {
  readonly salons: Pick<SalonsRepository, 'findById' | 'patch'>;
  readonly notifier: SalonStateNotifier;
  /** The admin record of the change (alert + admin email, `salon.audience_widened`). */
  readonly alerts?: Pick<AlertsService, 'raise'>;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export const createSalonAudienceService = (deps: SalonAudienceDeps): SalonAudienceService => {
  const now = deps.now ?? ((): Date => new Date());
  return {
    async widen({ salonId, memberId, audience }) {
      const salon = await deps.salons.findById(salonId);
      if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      // A clinic is always BOTH, so it can never widen; anything else that is not MALE/FEMALE →
      // BOTH is a narrowing (admin only).
      if (salon.businessType !== 'SALON' || !isWidening(salon.audience, audience)) {
        throw new BusinessRuleError({ code: ERROR_CODES.AUDIENCE_CHANGE_NOT_ALLOWED });
      }
      const updated = await deps.salons.patch(salonId, { set: { audience } });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      const at = now();
      try {
        await deps.alerts?.raise({
          kind: 'SALON_AUDIENCE_WIDENED',
          severity: 'INFO',
          dedupeKey: `salon-audience:${salonId}:${String(at.getTime())}`,
          entityType: 'SALON',
          entityId: salonId,
          data: { salonName: salon.name, memberId, from: salon.audience, to: audience },
        });
        await deps.notifier.changed({ salonId, event: 'salon.audience_widened' });
      } catch (error) {
        // The change itself is done; a failed alert or notice must not undo it.
        deps.logger.error({ err: error, salonId }, 'salon audience notification failed');
      }
      return { businessType: updated.businessType, audience: updated.audience };
    },
  };
};
