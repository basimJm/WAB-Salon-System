import ar from '../ar/bookings.json';
import en from '../en/bookings.json';
import type { LazyBundle } from './bundle';

/** Booking labels, loaded with the screens that show them (bookings, transactions, reviews, audit). */
export const BOOKINGS_STRINGS = { ar, en } as const satisfies LazyBundle;
