/**
 * Business types and audience (BUSINESS_DOMAIN §2, §5.19): a business is a SALON or a CLINIC; a SALON serves
 * men, women or both, a CLINIC always serves both. `businessType` never changes after the application.
 */
export const BUSINESS_TYPES = ['SALON', 'CLINIC'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const AUDIENCES = ['FEMALE', 'MALE', 'BOTH'] as const;
export type Audience = (typeof AUDIENCES)[number];

/** The audience every CLINIC has (§5.19: never asked, never changed). */
export const CLINIC_AUDIENCE: Audience = 'BOTH';

export const isBusinessType = (value: unknown): value is BusinessType =>
  BUSINESS_TYPES.some((t) => t === value);

export const isAudience = (value: unknown): value is Audience => AUDIENCES.some((a) => a === value);

/** The audiences a business of this type may have: every audience for a SALON, only BOTH for a CLINIC. */
export const audiencesFor = (type: BusinessType): readonly Audience[] =>
  type === 'CLINIC' ? [CLINIC_AUDIENCE] : AUDIENCES;

/** The audience to keep when the type changes on a form: a CLINIC forces BOTH. */
export const audienceFor = (type: BusinessType, wanted: Audience): Audience =>
  audiencesFor(type).includes(wanted) ? wanted : CLINIC_AUDIENCE;

/** Widening = MALE/FEMALE → BOTH (keeps every service and booking); everything else narrows (§5.19). */
export const isWidening = (from: Audience, to: Audience): boolean => from !== to && to === 'BOTH';

/** Only a SALON's audience can change, and only to a different value (§5.19, AUDIENCE_CHANGE_NOT_ALLOWED). */
export const canChangeAudience = (type: BusinessType): boolean => type === 'SALON';

/** A person's gender (customers, companions, campaign and banner targeting); never a business's audience. */
export const PERSON_GENDERS = ['FEMALE', 'MALE'] as const;
export type PersonGender = (typeof PERSON_GENDERS)[number];

/** What a business is and who it serves (salon, catalog service, placement). */
export interface BusinessKind {
  readonly businessType: BusinessType;
  readonly audience: Audience;
}

/**
 * Whether a catalog service may be offered by a business (§5.19, the server's rule): same type, and a BOTH
 * service fits every business of its type while a BOTH business takes every service of its type.
 */
export const catalogFits = (service: BusinessKind, business: BusinessKind): boolean =>
  service.businessType === business.businessType &&
  (service.audience === 'BOTH' ||
    business.audience === 'BOTH' ||
    service.audience === business.audience);

/** Bride bookings, `brideOnly` services and `brideQualified` staff (§5.19): SALONs with audience FEMALE or BOTH only. */
export const brideAllowed = (business: BusinessKind): boolean =>
  business.businessType === 'SALON' && business.audience !== 'MALE';
