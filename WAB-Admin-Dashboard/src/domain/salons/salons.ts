import type { Audience, BusinessType } from '@/domain/shared/businessType';
import type { Page, PageQuery } from '@/domain/shared/page';

export const SALON_STATES = [
  'APPLICATION_PENDING',
  'APPLICATION_REJECTED',
  'APPROVED_INCOMPLETE',
  'LIVE',
  'OFFLINE',
] as const;
export type SalonState = (typeof SALON_STATES)[number];
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED';

export interface SalonSummary {
  readonly id: string;
  readonly name: string;
  readonly businessType: BusinessType;
  readonly audience: Audience;
  readonly state: SalonState;
  readonly cityId: string | null;
  readonly areaId: string | null;
  readonly rating: { readonly avg: number; readonly count: number };
  readonly subscriptionStatus: SubscriptionStatus | null;
  readonly recommended: boolean;
  /** Bookings created in the last 30 days. */
  readonly bookings30d: number;
  /** The owner asked to delete the salon; the admin has not decided yet when `deletionApprovedAt` is null. */
  readonly deletionRequestedAt: string | null;
  readonly createdAt: string;
}

export interface SalonDetails extends SalonSummary {
  readonly deletionApprovedAt: string | null;
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
  /** The member's branch; null for the owner (all branches). */
  readonly branchId: string | null;
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
  businessType?: BusinessType;
  audience?: Audience;
  cityId?: string;
  q?: string;
  subscription?: SubscriptionStatus;
  recommended?: boolean;
  /** Only salons with an open deletion request. */
  deletionRequested?: boolean;
}

export const SUBSCRIPTION_STATUSES = ['TRIAL', 'ACTIVE', 'EXPIRED'] as const;

/** Booking counts by status (all eight statuses). */
export type StatusCounts = Readonly<Record<string, number>>;

export interface SalonKpis {
  readonly rating: { readonly avg: number; readonly count: number };
  readonly bookings: {
    readonly total: number;
    readonly last30d: number;
    readonly byStatus: StatusCounts;
    readonly byStatus30d: StatusCounts;
  };
  readonly activeServices: number;
  readonly activeStaff: number;
}

export interface SalonAnalytics {
  readonly from: string;
  readonly to: string;
  readonly total: number;
  readonly days: readonly { readonly date: string; readonly bookings: number }[];
  readonly byStatus: StatusCounts;
}

/** One thing an admin did to this salon. */
export interface SalonActivity {
  readonly id: string;
  readonly action: string;
  readonly adminId: string;
  readonly reason: string;
  readonly createdAt: string;
}

export type DeletionDecision = 'APPROVE' | 'REJECT';

export interface SalonsRepository {
  list(query: SalonQuery): Promise<Page<SalonSummary>>;
  get(id: string): Promise<SalonDetails>;
  /** Every member, or only the members of one branch. */
  members(id: string, branchId?: string): Promise<readonly SalonMember[]>;
  kpis(id: string): Promise<SalonKpis>;
  /** Bookings per Amman day between two local days (inclusive). */
  analytics(id: string, range: { from: string; to: string }): Promise<SalonAnalytics>;
  activity(id: string, query: PageQuery): Promise<Page<SalonActivity>>;
  /** Approving needs no open booking left; the server answers 409 SCHEDULE_CONFLICT otherwise. */
  decideDeletion(id: string, decision: DeletionDecision, reason: string): Promise<void>;
  setOffline(id: string, reason: string): Promise<void>;
  setOnline(id: string, reason: string): Promise<void>;
  /**
   * SALON only (§5.19). Widening to BOTH keeps everything; narrowing switches off services that no longer fit
   * and is refused with 409 SCHEDULE_CONFLICT (booking ids in the error details) while future bookings exist.
   */
  changeAudience(id: string, audience: Audience, reason: string): Promise<SalonDetails>;
  /** Reading the full IBAN is audited by the server; never cache the answer. */
  payoutDetails(id: string): Promise<PayoutDetails | null>;
  replacePayoutDetails(
    id: string,
    input: PayoutDetailsInput,
    reason: string,
  ): Promise<PayoutDetails>;
}
