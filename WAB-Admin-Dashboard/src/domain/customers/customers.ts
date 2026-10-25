import type { Page, PageQuery } from '@/domain/shared/page';
import type { SalonGender } from '@/domain/salons/salons';

export const CUSTOMER_STATUSES = ['ACTIVE', 'BLOCKED', 'DELETION_PENDING', 'DELETED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface CustomerSummary {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly gender: SalonGender;
  readonly cityId: string;
  readonly status: CustomerStatus;
  readonly registeredAt: string;
  readonly lastActiveAt: string | null;
  readonly bookingsCount: number;
}
export interface CustomerDevice {
  readonly app: string;
  readonly platform: string;
  readonly appVersion: string;
  readonly lastSeenAt: string;
  readonly pushToken: boolean;
}
export interface CustomerDetails extends CustomerSummary {
  readonly email: string;
  readonly areaId: string;
  readonly language: string;
  readonly pushEnabled: boolean;
  readonly blockedReason: string | null;
  readonly blockedAt: string | null;
  readonly deletionScheduledAt: string | null;
  /** Id to look the customer up in analytics journeys. */
  readonly journeyUserId: string;
  readonly devices: readonly CustomerDevice[];
}

export interface CustomerQuery extends PageQuery {
  status?: CustomerStatus;
  gender?: SalonGender;
  cityId?: string;
  q?: string;
}

export type CustomerAction = 'block' | 'unblock' | 'delete' | 'restore';

export interface LocalizedText {
  readonly ar: string;
  readonly en: string;
}

/** A review the customer wrote (about a salon or one of its staff). */
export interface CustomerReview {
  readonly id: string;
  readonly target: 'SALON' | 'STAFF';
  readonly status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
  readonly rating: number;
  readonly comment: string | null;
  readonly salon: { readonly id: string; readonly name: string };
  readonly staff: { readonly id: string; readonly firstName: string } | null;
  readonly branch: {
    readonly id: string;
    readonly name: { readonly ar: string; readonly en: string };
  } | null;
  readonly createdAt: string;
}

/** A notification the customer received, with the push outcome. */
export interface CustomerNotification {
  readonly id: string;
  readonly event: string;
  readonly type: 'BOOKING' | 'PROMOTION' | 'SYSTEM';
  readonly title: LocalizedText;
  readonly body: LocalizedText;
  readonly readAt: string | null;
  readonly pushSent: boolean;
  readonly pushResult: string | null;
  readonly createdAt: string;
}

/** Only what changed. */
export interface CustomerProfilePatch {
  firstName?: string;
  lastName?: string;
  email?: string;
  gender?: SalonGender;
  cityId?: string;
  areaId?: string;
  language?: 'ar' | 'en';
}

export interface PushInput {
  readonly title: LocalizedText;
  readonly body: LocalizedText;
  /** An in-app path (`/bookings/…`) or an https address. */
  readonly link?: string;
}

export interface PushResult {
  readonly campaignId: string;
  readonly status: string;
  readonly scheduledAt: string;
}

export interface CustomersRepository {
  list(query: CustomerQuery): Promise<Page<CustomerSummary>>;
  get(id: string): Promise<CustomerDetails>;
  act(id: string, action: CustomerAction, reason: string): Promise<void>;
  update(id: string, patch: CustomerProfilePatch, reason: string): Promise<void>;
  reviews(id: string, query: PageQuery): Promise<Page<CustomerReview>>;
  notifications(id: string, query: PageQuery): Promise<Page<CustomerNotification>>;
  /** Deletes the account now, skipping the 30-day grace. */
  forceDelete(id: string, reason: string): Promise<void>;
  /** Sends one push (and an in-app notification) to this customer. */
  push(id: string, input: PushInput, reason: string): Promise<PushResult>;
}

/** Which actions make sense for a status: the server refuses the others. */
export function actionsFor(status: CustomerStatus): readonly CustomerAction[] {
  if (status === 'ACTIVE') return ['block', 'delete'];
  if (status === 'BLOCKED') return ['unblock', 'delete'];
  if (status === 'DELETION_PENDING') return ['restore'];
  return [];
}
