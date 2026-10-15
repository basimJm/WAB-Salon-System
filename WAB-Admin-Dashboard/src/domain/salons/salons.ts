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

export interface SalonQuery extends PageQuery {
  state?: SalonState;
  gender?: SalonGender;
  cityId?: string;
  q?: string;
}

export interface SalonsRepository {
  list(query: SalonQuery): Promise<Page<SalonSummary>>;
}
