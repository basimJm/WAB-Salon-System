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
}
