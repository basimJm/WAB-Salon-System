import type { Page, PageQuery } from '@/domain/shared/page';

export const SALON_STATES = [
  'APPLICATION_PENDING',
  'APPLICATION_REJECTED',
  'APPROVED_INCOMPLETE',
  'LIVE',
  'OFFLINE',
] as const;
export const SALON_GENDERS = ['FEMALE', 'MALE'] as const;
export type SalonState = (typeof SALON_STATES)[number];
export type SalonGender = (typeof SALON_GENDERS)[number];
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED';

export interface SalonSummary {
  readonly id: string;
  readonly name: string;
  readonly gender: SalonGender;
  readonly state: SalonState;
  readonly cityId: string | null;
  readonly areaId: string | null;
  readonly rating: { readonly avg: number; readonly count: number };
  readonly subscriptionStatus: SubscriptionStatus | null;
  readonly createdAt: string;
}

export interface SalonDetails extends SalonSummary {
  readonly description: string | null;
  readonly phone: string | null;
  /** Profile parts still missing before the salon can be visible. */
  readonly completeness: { readonly missing: readonly string[]; readonly isComplete: boolean };
  readonly offline: { readonly reason: string; readonly at: string } | null;
  readonly owner: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
  } | null;
  readonly subscription: {
    readonly status: SubscriptionStatus;
    readonly trialEndsAt: string;
    readonly currentPeriodEnd: string | null;
  } | null;
}

export interface SalonMember {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly role: string;
  readonly active: boolean;
  readonly providesServices: boolean;
  readonly permissions: readonly string[];
}

export interface PayoutDetails {
  readonly bankName: string;
  readonly accountHolderName: string;
  readonly ibanLast4: string;
  /** The full IBAN: only present when an admin reads it (the server audits every read). */
  readonly iban?: string;
}
export interface PayoutDetailsInput {
  bankName: string;
  accountHolderName: string;
  iban: string;
}

const IBAN = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;
/** Spaces and case do not matter when typing an IBAN. */
export const normalizeIban = (text: string): string => text.replace(/\s+/g, '').toUpperCase();
export const isIban = (text: string): boolean => IBAN.test(normalizeIban(text));

export interface SalonQuery extends PageQuery {
  state?: SalonState;
  gender?: SalonGender;
  cityId?: string;
  q?: string;
}

export interface SalonsRepository {
  list(query: SalonQuery): Promise<Page<SalonSummary>>;
  get(id: string): Promise<SalonDetails>;
  members(id: string): Promise<readonly SalonMember[]>;
  setOffline(id: string, reason: string): Promise<void>;
  setOnline(id: string, reason: string): Promise<void>;
  /** Services of the salon are switched off by the server: the caller must warn first. */
  changeGender(id: string, gender: SalonGender, reason: string): Promise<SalonDetails>;
  /** Reading the full IBAN is audited by the server; never cache the answer. */
  payoutDetails(id: string): Promise<PayoutDetails | null>;
  replacePayoutDetails(
    id: string,
    input: PayoutDetailsInput,
    reason: string,
  ): Promise<PayoutDetails>;
}
