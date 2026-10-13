import type { PAYMENT_OPTIONS } from '../../constants/salon';
import { assertFils, percentOf, sumFils } from '../../utils/money';

export type PaymentOption = (typeof PAYMENT_OPTIONS)[number];

/** One service of a person, as snapshotted at booking time (integer fils / minutes). */
export interface PricedService {
  readonly price: number;
  readonly durationMinutes: number;
}

export interface PricedPerson {
  readonly services: readonly PricedService[];
}

export interface PersonAmounts {
  /** Σ service prices. */
  readonly subtotal: number;
  /** Σ service durations; the appointment of this person lasts this long. */
  readonly durationMinutes: number;
}

export interface BookingAmounts {
  readonly persons: readonly PersonAmounts[];
  readonly total: number;
  /** The salon's deposit share of `total` (0 when the policy defines no deposit percentage). */
  readonly deposit: number;
  /** What the customer pays online now. */
  readonly dueOnline: number;
  /** What is left to pay at the salon after the online payment. */
  readonly remaining: number;
}

export interface PricingInput {
  readonly persons: readonly PricedPerson[];
  readonly paymentOption: PaymentOption;
  /** Whole percent 1-100 from the salon policy; required for `DEPOSIT`. */
  readonly depositPercentage?: number | undefined;
}

/**
 * Amounts of a booking (BUSINESS_DOMAIN.md §5.5), all in integer fils:
 * `subtotal` = Σ prices, `total` = Σ subtotals, `deposit` = round-half-up(total × pct / 100),
 * `dueOnline` = deposit | total | 0, `remaining` = total − dueOnline.
 * The deposit is computed as a share of the total (never per person), so rounding happens once.
 * Bad input is a caller bug (`TypeError` / `RangeError`); client input is validated before this.
 */
export const calculateAmounts = ({
  persons,
  paymentOption,
  depositPercentage,
}: PricingInput): BookingAmounts => {
  if (persons.length === 0) throw new RangeError('a booking needs at least one person');
  const amounts = persons.map(({ services }): PersonAmounts => {
    if (services.length === 0) throw new RangeError('a person needs at least one service');
    for (const service of services) {
      assertFils(service.price);
      if (service.price < 0) throw new RangeError('a price cannot be negative');
      if (!Number.isInteger(service.durationMinutes) || service.durationMinutes <= 0) {
        throw new RangeError('a duration must be a positive whole number of minutes');
      }
    }
    return {
      subtotal: sumFils(services.map((s) => s.price)),
      durationMinutes: services.reduce((minutes, s) => minutes + s.durationMinutes, 0),
    };
  });
  const total = sumFils(amounts.map((a) => a.subtotal));
  if (paymentOption === 'DEPOSIT' && depositPercentage === undefined) {
    throw new RangeError('the DEPOSIT option needs a deposit percentage');
  }
  const deposit = depositPercentage === undefined ? 0 : percentOf(total, depositPercentage);
  const dueOnline =
    paymentOption === 'DEPOSIT' ? deposit : paymentOption === 'FULL_ONLINE' ? total : 0;
  return { persons: amounts, total, deposit, dueOnline, remaining: total - dueOnline };
};
