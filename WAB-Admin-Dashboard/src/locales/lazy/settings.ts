import ar from '../ar/settings.json';
import en from '../en/settings.json';
import type { LazyBundle } from './bundle';

/** Platform settings labels (A28): loaded with the settings page, kept out of the entry. */
export const SETTINGS_STRINGS = { ar, en } as const satisfies LazyBundle;
