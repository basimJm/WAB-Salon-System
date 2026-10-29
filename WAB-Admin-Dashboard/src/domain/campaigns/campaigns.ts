import type { LocalizedName } from '@/domain/locations/locations';
import type { AppKind } from '@/domain/appconfig/appConfig';
import type { Page, PageQuery } from '@/domain/shared/page';
import type { PersonGender } from '@/domain/shared/businessType';

export const CAMPAIGN_STATUSES = ['SCHEDULED', 'SENDING', 'SENT', 'CANCELLED'] as const;
export const AUDIENCE_KINDS = [
  'ALL',
  'GUESTS',
  'REGISTERED',
  'GENDER',
  'CITY',
  'SALON_MEMBERS',
  'SPECIFIC_USERS',
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];

export interface Audience {
  kind: AudienceKind;
  gender?: PersonGender;
  cityIds?: string[];
  salonId?: string;
  customerIds?: string[];
}
export interface CampaignStats {
  readonly targeted: number;
  readonly sent: number;
  readonly delivered: number;
  readonly opened: number;
  readonly failed: number;
}
export interface Campaign {
  readonly id: string;
  readonly title: LocalizedName;
  readonly body: LocalizedName;
  readonly app: AppKind;
  readonly audience: { readonly kind: AudienceKind };
  readonly link: string | null;
  readonly status: CampaignStatus;
  readonly scheduledAt: string;
  readonly sentAt: string | null;
  readonly cancelledAt: string | null;
  readonly stats: CampaignStats;
  readonly createdBy: string;
}
export interface CampaignInput {
  title: LocalizedName;
  body: LocalizedName;
  app: AppKind;
  audience: Audience;
  link?: string;
  /** Null or missing = send now. */
  scheduledAt?: string | null;
}

export interface CampaignsRepository {
  list(query: PageQuery & { status?: CampaignStatus; app?: AppKind }): Promise<Page<Campaign>>;
  create(input: CampaignInput, reason: string): Promise<Campaign>;
  audienceSize(app: AppKind, audience: Audience): Promise<number>;
  /** Only a campaign that has not started can be cancelled. */
  cancel(id: string, reason: string): Promise<Campaign>;
}

export const MAX_TITLE = 200;
export const MAX_BODY = 1000;
export const MAX_LINK = 500;
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const LINK = /^(\/[A-Za-z0-9/_-]*|https:\/\/\S+)$/;

export type CampaignError =
  'titleAr' | 'titleEn' | 'bodyAr' | 'bodyEn' | 'link' | 'audience' | 'schedule';
export interface CampaignForm {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  link: string;
  audience: Audience;
  /** `YYYY-MM-DD` and `HH:mm`, both empty = send now. */
  day: string;
  time: string;
}

const textBad = (v: string, max: number) => !v.trim() || v.length > max;

/** The audience must carry what its kind needs (gender, cities, a salon, or 1-500 customer ids). */
export function audienceValid(a: Audience): boolean {
  if (a.kind === 'GENDER') return a.gender !== undefined;
  if (a.kind === 'CITY') return (a.cityIds?.length ?? 0) > 0;
  if (a.kind === 'SALON_MEMBERS') return !!a.salonId && OBJECT_ID.test(a.salonId);
  if (a.kind === 'SPECIFIC_USERS') {
    const ids = a.customerIds ?? [];
    return ids.length > 0 && ids.length <= 500 && ids.every((i) => OBJECT_ID.test(i));
  }
  return true;
}

const scheduleBad = (day: string, time: string): boolean => {
  if (!day && !time) return false;
  return !/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time);
};

export function validateCampaign(f: CampaignForm): CampaignError[] {
  const checks: ReadonlyArray<readonly [CampaignError, boolean]> = [
    ['titleAr', textBad(f.titleAr, MAX_TITLE)],
    ['titleEn', textBad(f.titleEn, MAX_TITLE)],
    ['bodyAr', textBad(f.bodyAr, MAX_BODY)],
    ['bodyEn', textBad(f.bodyEn, MAX_BODY)],
    ['link', f.link !== '' && (!LINK.test(f.link) || f.link.length > MAX_LINK)],
    ['audience', !audienceValid(f.audience)],
    ['schedule', scheduleBad(f.day, f.time)],
  ];
  return checks.filter(([, bad]) => bad).map(([name]) => name);
}

/** Splits pasted customer ids (commas, spaces, new lines) into a clean unique list. */
export const parseIds = (text: string): string[] => [
  ...new Set(text.split(/[\s,;]+/).filter(Boolean)),
];
