import type { Language } from '@/constants/i18n';
import arAnalytics from './ar/analytics.json';
import arAnalyticsOps from './ar/analyticsOps.json';
import enAnalytics from './en/analytics.json';
import enAnalyticsOps from './en/analyticsOps.json';

/**
 * Locale areas kept OUT of the entry bundle: they are loaded with the screens that use them (the analytics boards'
 * labels are ~4 KB gzip and would break the entry budget). A page registers them with `useLazyStrings(area)`.
 */
export const LAZY_AREAS = {
  analytics: {
    ar: { ...arAnalytics, ...arAnalyticsOps },
    en: { ...enAnalytics, ...enAnalyticsOps },
  },
} as const satisfies Record<string, Record<Language, object>>;

export type LazyArea = keyof typeof LAZY_AREAS;
/** Area files on disk that belong to a lazy area (tests check every other file is merged into the entry). */
export const LAZY_AREA_FILES: Readonly<Record<LazyArea, readonly string[]>> = {
  analytics: ['analytics.json', 'analyticsOps.json'],
};
