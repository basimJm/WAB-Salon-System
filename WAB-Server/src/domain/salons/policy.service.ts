import { ERROR_CODES } from '../../constants/errorCodes';
import type { SalonPolicy, SalonRaw } from '../../models/salon.model';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { Entity } from '../../utils/database/plain';
import { NotFoundError } from '../../utils/errors';
import type { SalonStateService } from './salonState.service';

export interface PolicyInput {
  readonly cancellationWindowHours: number;
  readonly paymentOptions: readonly SalonPolicy['paymentOptions'][number][];
  /** Required (1-100) when `DEPOSIT` is offered; ignored otherwise. */
  readonly depositPercentage?: number | undefined;
  readonly depositRefundableOnCustomerCancel: boolean;
  readonly fullPaymentRefundOnCustomerCancel: SalonPolicy['fullPaymentRefundOnCustomerCancel'];
  readonly noShowDeposit: SalonPolicy['noShowDeposit'];
  readonly noShowFullPayment: SalonPolicy['noShowFullPayment'];
  readonly notes?: string | undefined;
}

export interface PolicyView extends Omit<SalonPolicy, 'depositPercentage' | 'notes'> {
  readonly depositPercentage: number | null;
  readonly notes: string | null;
}

export interface PolicyService {
  /** `null` until the salon has set one. */
  get(salonId: string): Promise<PolicyView | null>;
  set(salonId: string, policy: PolicyInput): Promise<PolicyView>;
}

export interface PolicyDeps {
  readonly salons: Pick<SalonsRepository, 'findById' | 'patch'>;
  readonly state: Pick<SalonStateService, 'recompute'>;
}

const toView = (policy: NonNullable<Entity<SalonRaw>['policy']>): PolicyView => ({
  cancellationWindowHours: policy.cancellationWindowHours,
  paymentOptions: policy.paymentOptions,
  depositPercentage: policy.depositPercentage ?? null,
  depositRefundableOnCustomerCancel: policy.depositRefundableOnCustomerCancel,
  fullPaymentRefundOnCustomerCancel: policy.fullPaymentRefundOnCustomerCancel,
  noShowDeposit: policy.noShowDeposit,
  noShowFullPayment: policy.noShowFullPayment,
  notes: policy.notes ?? null,
});

/**
 * The salon's current policy. Every booking copies it when it is made, so a change here only
 * affects new bookings (BUSINESS_DOMAIN.md §3.3 "snapshot").
 */
export const createPolicyService = ({ salons, state }: PolicyDeps): PolicyService => ({
  async get(salonId) {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon.policy === undefined ? null : toView(salon.policy);
  },

  async set(salonId, input) {
    const options = [...new Set(input.paymentOptions)];
    const policy: SalonPolicy = {
      cancellationWindowHours: input.cancellationWindowHours,
      paymentOptions: options,
      ...(options.includes('DEPOSIT') && input.depositPercentage !== undefined
        ? { depositPercentage: input.depositPercentage }
        : {}),
      depositRefundableOnCustomerCancel: input.depositRefundableOnCustomerCancel,
      fullPaymentRefundOnCustomerCancel: input.fullPaymentRefundOnCustomerCancel,
      noShowDeposit: input.noShowDeposit,
      noShowFullPayment: input.noShowFullPayment,
      ...(input.notes === undefined || input.notes === '' ? {} : { notes: input.notes }),
    };
    // The whole policy is replaced, so a dropped deposit percentage or note really disappears.
    const updated = await salons.patch(salonId, { set: { policy } });
    if (updated === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    await state.recompute(salonId);
    return toView(policy);
  },
});
