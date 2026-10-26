import ar from '../ar/analytics.json';
import arOps from '../ar/analyticsOps.json';
import en from '../en/analytics.json';
import enOps from '../en/analyticsOps.json';
import type { LazyBundle } from './bundle';

/** Analytics boards' labels (~4 KB gzip), loaded with the analytics screens only. */
export const ANALYTICS_STRINGS = {
  ar: { ...ar, ...arOps },
  en: { ...en, ...enOps },
} as const satisfies LazyBundle;
