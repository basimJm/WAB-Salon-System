import { useState } from 'react';
import { MIN_REASON_LENGTH } from '@/constants/ui';
import { APP_KINDS, type AppKind } from '@/domain/appconfig/appConfig';
import {
  validateCampaign,
  type Audience,
  type CampaignError,
  type CampaignInput,
} from '@/domain/campaigns/campaigns';
import { zonedTimeToUtc } from '@/domain/shared/time';

export interface CampaignDraft {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  app: AppKind;
  link: string;
  audience: Audience;
  day: string;
  time: string;
  reason: string;
}
const INITIAL: CampaignDraft = {
  titleAr: '',
  titleEn: '',
  bodyAr: '',
  bodyEn: '',
  app: APP_KINDS[0],
  link: '',
  audience: { kind: 'ALL' },
  day: '',
  time: '',
  reason: '',
};

const scheduleOf = (day: string, time: string): string | null => {
  if (!day || !time) return null;
  const [h = '0', m = '0'] = time.split(':');
  return zonedTimeToUtc(day, Number(h) * 60 + Number(m)).toISOString();
};

/** The campaign form: one draft, its validation and the request body once valid. */
export function useCampaignForm() {
  const [draft, setDraft] = useState<CampaignDraft>(INITIAL);
  const [tried, setTried] = useState(false);
  const problems: CampaignError[] = validateCampaign(draft);
  const reasonBad = draft.reason.trim().length < MIN_REASON_LENGTH;
  return {
    draft,
    patch: (change: Partial<CampaignDraft>) => setDraft((d) => ({ ...d, ...change })),
    tried,
    reasonBad,
    error: (k: CampaignError): boolean => tried && problems.includes(k),
    submit: (): { input: CampaignInput; reason: string } | null => {
      setTried(true);
      if (problems.length > 0 || reasonBad) return null;
      return {
        input: {
          title: { ar: draft.titleAr.trim(), en: draft.titleEn.trim() },
          body: { ar: draft.bodyAr.trim(), en: draft.bodyEn.trim() },
          app: draft.app,
          audience: draft.audience,
          ...(draft.link ? { link: draft.link } : {}),
          scheduledAt: scheduleOf(draft.day, draft.time),
        },
        reason: draft.reason.trim(),
      };
    },
  };
}
