import type { AppKind } from '@/domain/appconfig/appConfig';
import type { LocalizedName } from '@/domain/locations/locations';
import type { AdminResource } from '@/domain/shared/resource';

export const PAGE_KINDS = ['PRIVACY', 'TERMS', 'ABOUT'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
/** Body of a legal page in both languages: sanitized HTML written with the rich text editor. */
export type PageBody = LocalizedName;
export const MAX_PAGE_BODY = 50_000;

export interface ContentPage {
  readonly id: string;
  readonly app: AppKind;
  readonly kind: PageKind;
  readonly body: PageBody;
}
export interface ContentPageInput {
  app: AppKind;
  kind: PageKind;
  body: PageBody;
}
export type ContentPagePatch = { body?: PageBody };

export interface ContentRepository {
  readonly pages: AdminResource<ContentPage, ContentPageInput, ContentPagePatch, { app?: AppKind }>;
}

/** Blank bodies and bodies over the server limit are refused before sending. */
export function validateBody(body: PageBody): ReadonlyArray<'ar' | 'en'> {
  return (['ar', 'en'] as const).filter((l) => !body[l].trim() || body[l].length > MAX_PAGE_BODY);
}
