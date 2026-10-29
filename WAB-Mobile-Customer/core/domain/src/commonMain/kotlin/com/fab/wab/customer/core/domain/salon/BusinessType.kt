package com.fab.wab.customer.core.domain.salon

import com.fab.wab.customer.core.domain.session.Gender

/** What a business is (BUSINESS_DOMAIN §2 `BusinessType`, §5.19); immutable after the application. */
enum class BusinessType(val code: String) {
    SALON("SALON"),
    CLINIC("CLINIC"),
    ;

    companion object {
        /** Contract 1.10.0 migrated every legacy business to SALON, so an unknown or missing code reads as one. */
        fun fromCode(code: String?): BusinessType = entries.firstOrNull { it.code.equals(code?.trim(), ignoreCase = true) } ?: SALON

        /** A route / filter value: null means "every type". */
        fun fromCodeOrNull(code: String?): BusinessType? = entries.firstOrNull { it.code.equals(code?.trim(), ignoreCase = true) }
    }
}

/** Who a business serves (BUSINESS_DOMAIN §2 `Audience`); a CLINIC is always [BOTH]. */
enum class Audience(val code: String) {
    MALE("MALE"),
    FEMALE("FEMALE"),
    BOTH("BOTH"),
    ;

    /** The single gender every booking person must have, or null when persons of any gender may book (§5.19). */
    val lockedGender: Gender? get() = when (this) {
        MALE -> Gender.MALE
        FEMALE -> Gender.FEMALE
        BOTH -> null
    }

    companion object {
        fun fromCode(code: String?): Audience? = entries.firstOrNull { it.code.equals(code?.trim(), ignoreCase = true) }
    }
}

/** BUSINESS_DOMAIN §5.19 booking rules that depend on the business type and audience. */
object BusinessRules {
    /** Persons of a booking must all match the audience only for a MALE or FEMALE salon. */
    fun lockedGender(type: BusinessType, audience: Audience?): Gender? =
        if (type == BusinessType.CLINIC) null else audience?.lockedGender

    /** Bride bookings exist only for FEMALE or BOTH salons, never for clinics. */
    fun allowsBride(type: BusinessType, audience: Audience?): Boolean =
        type == BusinessType.SALON && (audience == Audience.FEMALE || audience == Audience.BOTH)
}
