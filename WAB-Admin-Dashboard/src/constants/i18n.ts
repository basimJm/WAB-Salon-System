export const LANGUAGES = ['ar', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'ar';
export const RTL_LANGUAGES: readonly Language[] = ['ar'];
export const I18N_DEFAULT_NAMESPACE = 'translation';
export const HTTP_LANGUAGE_HEADER = 'Accept-Language';

export type Direction = 'rtl' | 'ltr';
