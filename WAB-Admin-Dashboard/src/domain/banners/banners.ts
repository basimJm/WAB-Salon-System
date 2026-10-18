import type { LocalizedName } from '@/domain/locations/locations';
import type { AdminResource } from '@/domain/shared/resource';
import {
  addDays,
  isLocalDate,
  localDateOf,
  localDayRange,
  parseInstant,
} from '@/domain/shared/time';

export const BANNER_ACTIONS = ['NONE', 'SALON', 'EXTERNAL_URL'] as const;
export const BANNER_GENDERS = ['MALE', 'FEMALE', 'BOTH'] as const;
export type BannerAction = (typeof BANNER_ACTIONS)[number];
export type BannerGender = (typeof BANNER_GENDERS)[number];

export interface Banner {
  readonly id: string;
  /** Storage keys of the Arabic and English artwork. */
  readonly imageKey: LocalizedName;
  readonly action: BannerAction;
  readonly actionValue?: string | undefined;
  readonly gender: BannerGender;
  readonly startAt: string;
  readonly endAt: string;
  readonly order: number;
  readonly active: boolean;
}
export interface BannerInput {
  imageKey: LocalizedName;
  action?: BannerAction;
  actionValue?: string;
  gender: BannerGender;
  startAt: string | null;
  endAt: string | null;
  order?: number;
  active?: boolean;
}
export type BannerPatch = Partial<BannerInput> & { actionValue?: string | null };

export interface BannersRepository {
  readonly banners: AdminResource<Banner, BannerInput, BannerPatch, { gender?: BannerGender }>;
}

const HTTPS = /^https:\/\/\S+$/;
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const MAX_VALUE = 1000;

export type BannerFormError = 'imageAr' | 'imageEn' | 'schedule' | 'actionValue' | 'order';

export interface BannerFormValues {
  keyAr: string;
  keyEn: string;
  action: BannerAction;
  actionValue: string;
  startDate: string;
  endDate: string;
  order: string;
}

const scheduleValid = (start: string, end: string): boolean => {
  if ((start && !isLocalDate(start)) || (end && !isLocalDate(end))) return false;
  return !(start && end && end <= start);
};

const actionValueValid = (action: BannerAction, raw: string): boolean => {
  const value = raw.trim();
  if (action === 'SALON') return OBJECT_ID.test(value);
  if (action === 'EXTERNAL_URL') return HTTPS.test(value) && value.length <= MAX_VALUE;
  return true;
};

/** The action target must fit the action: a salon id, an https link, or nothing. */
export function validateBannerForm(v: BannerFormValues): BannerFormError[] {
  const checks: ReadonlyArray<readonly [BannerFormError, boolean]> = [
    ['imageAr', !v.keyAr],
    ['imageEn', !v.keyEn],
    ['schedule', !scheduleValid(v.startDate, v.endDate)],
    ['actionValue', !actionValueValid(v.action, v.actionValue)],
    ['order', !/^\d+$/.test(v.order) || Number(v.order) > 100_000],
  ];
  return checks.filter(([, bad]) => bad).map(([name]) => name);
}

/** Calendar day (Amman) -> the instant the day starts; an empty day means "no limit". */
export const dateToInstant = (date: string): string | null =>
  date ? localDayRange(date).start.toISOString() : null;

/** The stored end instant is the start of the day AFTER the last day shown. */
export const endDateToInstant = (date: string): string | null =>
  date ? localDayRange(addDays(date, 0)).end.toISOString() : null;

export const instantToDate = (iso: string | null | undefined): string =>
  iso ? localDateOf(parseInstant(iso)) : '';

/** Inverse of `endDateToInstant`: the last day the banner still shows. */
export const instantToEndDate = (iso: string | null | undefined): string =>
  iso ? addDays(localDateOf(parseInstant(iso)), -1) : '';
