import { EMAIL_PATTERN } from '@/constants/auth';
import type { CustomerDetails, CustomerProfilePatch, CustomerStatus, PushInput } from './customers';

export const PUSH_TITLE_MAX = 200;
export const PUSH_BODY_MAX = 1000;
export const PUSH_LINK_MAX = 500;
export const NAME_MAX = 50;
const PUSH_LINK = /^(\/[A-Za-z0-9/_-]*|https:\/\/\S+)$/;

/** The account is not already gone. */
export const canForceDelete = (status: CustomerStatus): boolean => status !== 'DELETED';

/** Only an active customer with a device that can receive a push. */
export const canPush = (c: Pick<CustomerDetails, 'status' | 'pushEnabled' | 'devices'>): boolean =>
  c.status === 'ACTIVE' && c.pushEnabled && c.devices.some((d) => d.pushToken);

export const isPushLink = (link: string): boolean =>
  link.length <= PUSH_LINK_MAX && PUSH_LINK.test(link);

export type PushField = 'titleAr' | 'titleEn' | 'bodyAr' | 'bodyEn' | 'link';

export function pushProblems(p: PushInput): ReadonlySet<PushField> {
  const bad = new Set<PushField>();
  const text = (v: string, max: number) => v.trim().length > 0 && v.length <= max;
  if (!text(p.title.ar, PUSH_TITLE_MAX)) bad.add('titleAr');
  if (!text(p.title.en, PUSH_TITLE_MAX)) bad.add('titleEn');
  if (!text(p.body.ar, PUSH_BODY_MAX)) bad.add('bodyAr');
  if (!text(p.body.en, PUSH_BODY_MAX)) bad.add('bodyEn');
  if (p.link !== undefined && !isPushLink(p.link)) bad.add('link');
  return bad;
}

export interface ProfileDraft {
  firstName: string;
  lastName: string;
  email: string;
  gender: 'MALE' | 'FEMALE';
  cityId: string;
  language: 'ar' | 'en';
}

/** The details carry one display name: the first word is the first name. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  return { firstName: first, lastName: rest.join(' ') };
}

export function draftOf(c: CustomerDetails): ProfileDraft {
  return {
    ...splitName(c.name),
    email: c.email,
    gender: c.gender,
    cityId: c.cityId,
    language: c.language === 'en' ? 'en' : 'ar',
  };
}

export type ProfileField = 'firstName' | 'lastName' | 'email';

export function profileProblems(d: ProfileDraft): ReadonlySet<ProfileField> {
  const bad = new Set<ProfileField>();
  if (d.firstName.trim() === '' || d.firstName.length > NAME_MAX) bad.add('firstName');
  if (d.lastName.trim() === '' || d.lastName.length > NAME_MAX) bad.add('lastName');
  if (d.email !== '' && !EMAIL_PATTERN.test(d.email)) bad.add('email');
  return bad;
}

/** Only the fields that differ from the loaded customer. */
export function profilePatch(c: CustomerDetails, d: ProfileDraft): CustomerProfilePatch {
  const before = draftOf(c);
  const patch: CustomerProfilePatch = {};
  if (d.firstName.trim() !== before.firstName) patch.firstName = d.firstName.trim();
  if (d.lastName.trim() !== before.lastName) patch.lastName = d.lastName.trim();
  if (d.email !== before.email && d.email !== '') patch.email = d.email;
  if (d.gender !== before.gender) patch.gender = d.gender;
  if (d.cityId !== before.cityId && d.cityId !== '') patch.cityId = d.cityId;
  if (d.language !== before.language) patch.language = d.language;
  return patch;
}
