import type { Page, PageQuery } from '@/domain/shared/page';

export const SUBSCRIPTION_STATUSES = ['TRIAL', 'ACTIVE', 'EXPIRED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** A subscription payment made outside the app (cash, transfer) and recorded by an admin. */
export interface SubscriptionPayment {
  readonly amount: string;
  readonly paidAt: string;
  readonly periodFrom: string;
  readonly periodTo: string;
  readonly method: string;
  readonly reference: string;
  readonly note: string | null;
  readonly recordedBy: string;
}
export interface Subscription {
  readonly salonId: string;
  readonly salonName: string;
  readonly status: SubscriptionStatus;
  readonly trialEndsAt: string;
  readonly currentPeriodEnd: string | null;
  readonly endsAt: string;
  readonly daysRemaining: number;
  readonly lastPayment: SubscriptionPayment | null;
  readonly payments: readonly SubscriptionPayment[];
}
export interface PaymentInput {
  amount: string;
  paidAt: string;
  periodFrom: string;
  periodTo: string;
  method: string;
  reference: string;
  note?: string;
}

export interface SubscriptionsRepository {
  list(
    query: PageQuery & { status?: SubscriptionStatus; endingInDays?: number },
  ): Promise<Page<Subscription>>;
  recordPayment(salonId: string, input: PaymentInput): Promise<Subscription>;
}

export const ENDING_WINDOWS = [7, 14, 30] as const;
export const MAX_METHOD = 40;
export const MAX_REFERENCE = 100;
export const MAX_NOTE = 300;
