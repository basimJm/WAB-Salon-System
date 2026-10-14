/** Query key of the settings list (first element = operation id, so realtime/invalidations match). */
export const SETTINGS_QUERY_KEY = ['getSettings'] as const;
/** Settings groups shown by the editor (the rest are added by ADM-032). */
export const CORE_SETTING_GROUPS = ['discovery', 'booking', 'otp'] as const;
export const SETTING_LIST_SEPARATOR = ',';
