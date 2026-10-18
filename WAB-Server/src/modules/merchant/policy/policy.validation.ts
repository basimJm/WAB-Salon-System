import { z } from 'zod';
import {
  CANCELLATION_WINDOW_MAX_HOURS,
  DEPOSIT_PERCENT_MAX,
  DEPOSIT_PERCENT_MIN,
  FULL_PAYMENT_REFUND_RULES,
  NO_SHOW_DEPOSIT_RULES,
  NO_SHOW_FULL_PAYMENT_RULES,
  PAYMENT_OPTIONS,
  SALON_NOTES_MAX_LENGTH,
} from '../../../constants/salon';

/** The whole policy at once; the deposit percentage is only needed when a deposit is offered. */
export const policySchema = z
  .object({
    cancellationWindowHours: z.number().int().min(0).max(CANCELLATION_WINDOW_MAX_HOURS),
    paymentOptions: z
      .array(z.enum(PAYMENT_OPTIONS))
      .min(1)
      .refine((options) => new Set(options).size === options.length),
    depositPercentage: z
      .number()
      .int()
      .min(DEPOSIT_PERCENT_MIN)
      .max(DEPOSIT_PERCENT_MAX)
      .optional(),
    depositRefundableOnCustomerCancel: z.boolean(),
    fullPaymentRefundOnCustomerCancel: z.enum(FULL_PAYMENT_REFUND_RULES),
    noShowDeposit: z.enum(NO_SHOW_DEPOSIT_RULES),
    noShowFullPayment: z.enum(NO_SHOW_FULL_PAYMENT_RULES),
    notes: z.string().trim().max(SALON_NOTES_MAX_LENGTH).optional(),
  })
  .refine((p) => !p.paymentOptions.includes('DEPOSIT') || p.depositPercentage !== undefined, {
    path: ['depositPercentage'],
    message: 'required when a deposit is offered',
  });
