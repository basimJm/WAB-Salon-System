import { useState } from 'react';
import { MIN_REASON_LENGTH } from '@/constants/ui';
import {
  dateToInstant,
  endDateToInstant,
  instantToDate,
  instantToEndDate,
  validateBannerForm,
  type Banner,
  type BannerAction,
  type BannerGender,
  type BannerInput,
} from '@/domain/banners/banners';
import type { LocalizedImages } from '../components/media/LocalizedImageUploader';

export interface BannerDraft {
  images: LocalizedImages;
  action: BannerAction;
  actionValue: string;
  gender: BannerGender;
  schedule: { start: string; end: string };
  order: string;
  active: boolean;
  reason: string;
}

const known = (key: string | undefined): { key: string; url: string } | null =>
  key ? { key, url: '' } : null;

export function initialBanner(item: Banner | null): BannerDraft {
  return {
    images: { ar: known(item?.imageKey.ar), en: known(item?.imageKey.en) },
    action: item?.action ?? 'NONE',
    actionValue: item?.actionValue ?? '',
    gender: item?.gender ?? 'BOTH',
    schedule: { start: instantToDate(item?.startAt), end: instantToEndDate(item?.endAt) },
    order: String(item?.order ?? 0),
    active: item?.active ?? true,
    reason: '',
  };
}

const toInput = (d: BannerDraft): BannerInput & { active: boolean } => ({
  imageKey: { ar: d.images.ar?.key ?? '', en: d.images.en?.key ?? '' },
  action: d.action,
  ...(d.action === 'NONE' ? {} : { actionValue: d.actionValue.trim() }),
  gender: d.gender,
  startAt: dateToInstant(d.schedule.start),
  endAt: endDateToInstant(d.schedule.end),
  order: Number(d.order),
  active: d.active,
});

/** The banner form: one draft object, its validation, and the value to send once everything is valid. */
export function useBannerForm(item: Banner | null) {
  const [draft, setDraft] = useState(() => initialBanner(item));
  const [tried, setTried] = useState(false);
  const problems = validateBannerForm({
    keyAr: draft.images.ar?.key ?? '',
    keyEn: draft.images.en?.key ?? '',
    action: draft.action,
    actionValue: draft.actionValue,
    startDate: draft.schedule.start,
    endDate: draft.schedule.end,
    order: draft.order,
  });
  const reasonBad = draft.reason.trim().length < MIN_REASON_LENGTH;
  return {
    draft,
    patch: (change: Partial<BannerDraft>) => setDraft((d) => ({ ...d, ...change })),
    tried,
    reasonBad,
    error: (k: string): boolean => tried && problems.some((p) => p === k),
    /** The input to send when valid; otherwise null and the errors start showing. */
    submit: () => {
      setTried(true);
      if (problems.length > 0 || reasonBad) return null;
      return { value: toInput(draft), reason: draft.reason.trim() };
    },
  };
}
