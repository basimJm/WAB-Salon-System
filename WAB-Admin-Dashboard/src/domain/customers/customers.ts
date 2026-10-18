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

export interface CustomersRepository {
  list(query: CustomerQuery): Promise<Page<CustomerSummary>>;
  get(id: string): Promise<CustomerDetails>;
  act(id: string, action: CustomerAction, reason: string): Promise<void>;
}

/** Which actions make sense for a status: the server refuses the others. */
export function actionsFor(status: CustomerStatus): readonly CustomerAction[] {
  if (status === 'ACTIVE') return ['block', 'delete'];
  if (status === 'BLOCKED') return ['unblock', 'delete'];
  if (status === 'DELETION_PENDING') return ['restore'];
  return [];
}
