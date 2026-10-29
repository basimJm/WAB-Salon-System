import ar from '../ar/salonAudience.json';
import en from '../en/salonAudience.json';
import type { LazyBundle } from './bundle';

/** Audience change drawer of a salon (§5.19): loaded with the salon details page, kept out of the entry. */
export const SALON_AUDIENCE_STRINGS = { ar, en } as const satisfies LazyBundle;
