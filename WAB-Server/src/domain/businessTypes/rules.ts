import type { Audience, BusinessType, Gender } from '../../constants/enums';

/** The audience every business of this type has, when the type fixes it (a CLINIC is always BOTH). */
export const FIXED_AUDIENCE: Readonly<Partial<Record<BusinessType, Audience>>> = { CLINIC: 'BOTH' };

/** The audience that serves everyone. */
export const AUDIENCE_ALL: Audience = 'BOTH';

/** What a business is and who it serves (salon, catalog service, placement, booking snapshot). */
export interface BusinessKind {
  readonly businessType: BusinessType;
  readonly audience: Audience;
}

/**
 * The audiences a customer of this gender sees (§5.19): their own and BOTH. CLINICs are always
 * BOTH, so this alone also shows every clinic.
 */
export const visibleAudiences = (gender: Gender): Audience[] => [gender, AUDIENCE_ALL];

/** Whether a customer of this gender may see (and book) the business. */
export const isVisibleTo = (business: Pick<BusinessKind, 'audience'>, gender: Gender): boolean =>
  visibleAudiences(gender).includes(business.audience);

/** The audience stored for a business of this type: CLINIC → BOTH whatever was sent. */
export const audienceFor = (businessType: BusinessType, audience: Audience): Audience =>
  FIXED_AUDIENCE[businessType] ?? audience;

/**
 * Whether a catalog service may be offered (or requested) by a business (§3.2): same business
 * type, and the service audience fits (a BOTH service fits every business of its type, a BOTH
 * business takes every service of its type).
 */
export const catalogFits = (service: BusinessKind, business: BusinessKind): boolean =>
  service.businessType === business.businessType &&
  (service.audience === AUDIENCE_ALL ||
    business.audience === AUDIENCE_ALL ||
    service.audience === business.audience);

/** The catalog audiences a business may use (Mongo `$in`), see {@link catalogFits}. */
export const catalogAudiencesFor = (business: Pick<BusinessKind, 'audience'>): Audience[] =>
  business.audience === AUDIENCE_ALL
    ? ['MALE', 'FEMALE', AUDIENCE_ALL]
    : [business.audience, AUDIENCE_ALL];

/** Bride bookings, `brideOnly` services and `brideQualified` staff (§5.19): FEMALE/BOTH salons only. */
export const brideAllowed = (business: BusinessKind): boolean =>
  business.businessType === 'SALON' && business.audience !== 'MALE';

/**
 * Whether a person of this gender may be booked (§5.19): a MALE/FEMALE salon takes only its own
 * gender; a BOTH salon and every clinic take any gender in one booking.
 */
export const personFits = (business: Pick<BusinessKind, 'audience'>, gender: Gender): boolean =>
  business.audience === AUDIENCE_ALL || business.audience === gender;

/**
 * An audience change is a widening when it goes from MALE/FEMALE to BOTH (the owner may do it);
 * any other change is a narrowing (admin only, §5.19).
 */
export const isWidening = (from: Audience, to: Audience): boolean =>
  from !== AUDIENCE_ALL && to === AUDIENCE_ALL;

/** The gender every person of a single-gender business has; `undefined` for BOTH (mixed). */
export const impliedGender = (business: Pick<BusinessKind, 'audience'>): Gender | undefined =>
  business.audience === 'MALE' || business.audience === 'FEMALE' ? business.audience : undefined;
