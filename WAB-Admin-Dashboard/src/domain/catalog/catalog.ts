import type { LocalizedName } from '@/domain/locations/locations';
import type { AdminResource } from '@/domain/shared/resource';

export const CATALOG_GENDERS = ['FEMALE', 'MALE'] as const;
export type CatalogGender = (typeof CATALOG_GENDERS)[number];

export interface CatalogService {
  readonly id: string;
  readonly name: LocalizedName;
  readonly description: LocalizedName;
  readonly imageKey: string;
  readonly gender: CatalogGender;
  readonly active: boolean;
  readonly sortOrder: number;
}
export interface CatalogServiceInput {
  name: LocalizedName;
  description: LocalizedName;
  imageKey: string;
  gender: CatalogGender;
  active?: boolean;
  sortOrder?: number;
}
export type CatalogServicePatch = Partial<Omit<CatalogServiceInput, 'gender'>>;

export interface CatalogRepository {
  readonly services: AdminResource<
    CatalogService,
    CatalogServiceInput,
    CatalogServicePatch,
    { gender?: CatalogGender }
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
