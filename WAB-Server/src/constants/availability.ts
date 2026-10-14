/** Availability endpoint and slot holds (SRV-069, BUSINESS_DOMAIN.md §5.4, §5.6). */
export const AVAILABILITY_ROUTES = { availability: '/:salonId/availability' } as const;
/** Persons of one booking: the main person plus companions (`booking.maxCompanions` is enforced by the draft). */
export const AVAILABILITY_MAX_OTHER_PICKS = 20;
export const AVAILABILITY_MAX_SERVICES = 20;
/** Separator inside a stored hold; holds are `draftId|startMs|endMs`. */
export const HOLD_FIELD_SEPARATOR = '|';
