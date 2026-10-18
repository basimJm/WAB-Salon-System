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

export interface Faq {
  readonly id: string;
  readonly app: AppKind;
  readonly question: LocalizedName;
  readonly answer: LocalizedName;
  readonly order: number;
}
export interface FaqInput {
  app: AppKind;
  question: LocalizedName;
  answer: LocalizedName;
  order?: number;
}
export type FaqPatch = Partial<Omit<FaqInput, 'app'>>;

export interface ContactInfo {
  readonly id: string;
  readonly app: AppKind;
  readonly phone: string;
  readonly whatsapp: string;
  readonly email: string;
}
export interface ContactInfoInput {
  app: AppKind;
  phone: string;
  whatsapp: string;
  email: string;
}
export type ContactInfoPatch = Partial<Omit<ContactInfoInput, 'app'>>;

export const MAX_FAQ_TEXT = 2000;
const E164 = /^\+[1-9][0-9]{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;
export const isPhone = (v: string): boolean => E164.test(v);
export const isEmail = (v: string): boolean => EMAIL.test(v) && v.length <= MAX_EMAIL;

export interface ContentRepository {
  readonly faqs: AdminResource<Faq, FaqInput, FaqPatch, { app?: AppKind }>;
  readonly contactInfo: AdminResource<
    ContactInfo,
    ContactInfoInput,
    ContactInfoPatch,
    { app?: AppKind }
  >;
  readonly pages: AdminResource<ContentPage, ContentPageInput, ContentPagePatch, { app?: AppKind }>;
}

/** Blank bodies and bodies over the server limit are refused before sending. */
export function validateBody(body: PageBody): ReadonlyArray<'ar' | 'en'> {
  return (['ar', 'en'] as const).filter((l) => !body[l].trim() || body[l].length > MAX_PAGE_BODY);
}
