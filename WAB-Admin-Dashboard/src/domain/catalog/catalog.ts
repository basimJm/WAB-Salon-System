import type { LocalizedName } from '@/domain/locations/locations';
import type { Audience, BusinessType } from '@/domain/shared/businessType';
import type { Page, PageQuery } from '@/domain/shared/page';
import type { AdminResource } from '@/domain/shared/resource';

export interface CatalogService {
  readonly id: string;
  readonly name: LocalizedName;
  readonly description: LocalizedName;
  readonly imageKey: string;
  /** §5.19: a SALON service serves MALE, FEMALE or BOTH; a CLINIC service is always BOTH. Fixed after creation. */
  readonly businessType: BusinessType;
  readonly audience: Audience;
  readonly active: boolean;
  readonly sortOrder: number;
}
export interface CatalogServiceInput {
  name: LocalizedName;
  description: LocalizedName;
  imageKey: string;
  businessType: BusinessType;
  audience: Audience;
  active?: boolean;
  sortOrder?: number;
}
export type CatalogServicePatch = Partial<Omit<CatalogServiceInput, 'businessType' | 'audience'>>;

export const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** A salon's suggestion for a service the catalog lacks (written in one language by the salon). */
export interface CatalogRequest {
  readonly id: string;
  readonly salonId: string;
  readonly salonName: string | null;
  readonly name: string;
  readonly description: string;
  readonly imageKey: string | null;
  readonly status: RequestStatus;
  readonly adminNote: string | null;
  readonly catalogServiceId: string | null;
  readonly createdAt: string;
}
/** Approving either creates a new catalog service from these (edited) values... */
export interface CreateServiceApproval {
  name: LocalizedName;
  description: LocalizedName;
  imageKey?: string;
  sortOrder?: number;
}
/** ...or maps the request to an existing active catalog service that fits the salon (`catalogFits`, SRV-125/178). */
export interface MapServiceApproval {
  catalogServiceId: string;
}
export type ApproveInput = CreateServiceApproval | MapServiceApproval;

export const APPROVE_MODES = ['create', 'map'] as const;
export type ApproveMode = (typeof APPROVE_MODES)[number];

export interface ApproveDraft {
  mode: ApproveMode;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  catalogServiceId: string;
}
export type ApproveField = 'nameAr' | 'nameEn' | 'descAr' | 'descEn' | 'service';

/** Create: both names and descriptions filled within their limits; map: an existing service picked. */
export function approveProblems(d: ApproveDraft): ReadonlySet<ApproveField> {
  if (d.mode === 'map') return new Set<ApproveField>(d.catalogServiceId ? [] : ['service']);
  const bad = (text: string, max: number) => !text.trim() || text.length > max;
  const checks: ReadonlyArray<readonly [ApproveField, boolean]> = [
    ['nameAr', bad(d.nameAr, MAX_NAME)],
    ['nameEn', bad(d.nameEn, MAX_NAME)],
    ['descAr', bad(d.descAr, MAX_DESCRIPTION)],
    ['descEn', bad(d.descEn, MAX_DESCRIPTION)],
  ];
  return new Set(checks.filter(([, failed]) => failed).map(([name]) => name));
}

/** The approval the server takes for the draft; a new service keeps the image the salon sent. */
export function approveInputOf(d: ApproveDraft, imageKey: string | null): ApproveInput {
  if (d.mode === 'map') return { catalogServiceId: d.catalogServiceId };
  return {
    name: { ar: d.nameAr.trim(), en: d.nameEn.trim() },
    description: { ar: d.descAr.trim(), en: d.descEn.trim() },
    ...(imageKey ? { imageKey } : {}),
  };
}

export interface CatalogRequests {
  list(
    query: PageQuery & { status?: RequestStatus; businessType?: BusinessType },
  ): Promise<Page<CatalogRequest>>;
  approve(id: string, input: ApproveInput, reason: string): Promise<CatalogRequest>;
  reject(id: string, reason: string): Promise<CatalogRequest>;
}

export interface CatalogServiceQuery {
  businessType?: BusinessType;
  audience?: Audience;
}

export interface CatalogRepository {
  readonly requests: CatalogRequests;
  readonly services: AdminResource<
    CatalogService,
    CatalogServiceInput,
    CatalogServicePatch,
    CatalogServiceQuery
  >;
}

export const MAX_NAME = 200;
export const MAX_DESCRIPTION = 500;
export type CatalogFormError = 'nameAr' | 'nameEn' | 'descAr' | 'descEn' | 'image' | 'order';

/** Names up to 200 and descriptions up to 500 characters in both languages, an image, a whole sort order. */
export function validateCatalogForm(v: {
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  imageKey: string;
  sortOrder: string;
}): CatalogFormError[] {
  const bad = (text: string, max: number) => !text.trim() || text.length > max;
  const checks: ReadonlyArray<readonly [CatalogFormError, boolean]> = [
    ['nameAr', bad(v.nameAr, MAX_NAME)],
    ['nameEn', bad(v.nameEn, MAX_NAME)],
    ['descAr', bad(v.descAr, MAX_DESCRIPTION)],
    ['descEn', bad(v.descEn, MAX_DESCRIPTION)],
    ['image', !v.imageKey],
    ['order', !/^\d+$/.test(v.sortOrder) || Number(v.sortOrder) > 100_000],
  ];
  return checks.filter(([, failed]) => failed).map(([name]) => name);
}
