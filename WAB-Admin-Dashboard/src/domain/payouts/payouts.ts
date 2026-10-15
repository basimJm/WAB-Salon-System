import type { Page, PageQuery } from '@/domain/shared/page';

export const PAYOUT_STATUSES = ['PENDING', 'TRANSFERRED'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** What a salon is owed: all amounts are JOD decimal strings (negative = money taken back). */
export interface SalonBalance {
  readonly salonId: string;
  readonly name: string;
  readonly balance: string;
  readonly charges: string;
  readonly gatewayFees: string;
  readonly refunds: string;
  readonly payouts: string;
  readonly adjustments: string;
  readonly dueNow: string;
  readonly lastPayout: {
    readonly periodTo: string;
    readonly net: string;
    readonly status: PayoutStatus;
  } | null;
}
export interface PayoutPreview {
  readonly salonId: string;
  readonly periodFrom: string;
  readonly periodTo: string;
  readonly gross: string;
  readonly fees: string;
  readonly refunds: string;
  readonly adjustments: string;
  readonly net: string;
}
export interface Payout extends PayoutPreview {
  readonly id: string;
  readonly status: PayoutStatus;
  readonly transferredAt: string | null;
  readonly transferReference: string | null;
  readonly note: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
}
export interface TransferInput {
  amount: string;
  transferredAt: string;
  transferReference: string;
  note: string;
}

export interface PayoutsRepository {
  balances(query: PageQuery): Promise<Page<SalonBalance>>;
  preview(salonId: string, periodTo: string): Promise<PayoutPreview>;
  list(query: PageQuery & { salonId?: string; status?: PayoutStatus }): Promise<Page<Payout>>;
  create(salonId: string, periodTo: string, note?: string): Promise<Payout>;
  /** Records the bank transfer made by hand: the payout becomes TRANSFERRED and the ledger gets its entry. */
  transfer(id: string, input: TransferInput): Promise<Payout>;
}

export const MAX_PAYOUT_NOTE = 300;
export const MAX_TRANSFER_REFERENCE = 100;
