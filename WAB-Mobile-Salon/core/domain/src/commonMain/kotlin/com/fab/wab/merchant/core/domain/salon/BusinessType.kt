package com.fab.wab.merchant.core.domain.salon

/** What the business is (BUSINESS_DOMAIN §5.19): chosen in the application and never changed afterwards. */
enum class BusinessType {
    SALON,
    CLINIC,
    ;

    companion object {
        fun fromCode(code: String?): BusinessType? = entries.firstOrNull { it.name == code }
    }
}

/** Who the business serves (§5.19): a salon MALE, FEMALE or BOTH; a clinic always BOTH. */
enum class Audience {
    MALE,
    FEMALE,
    BOTH,
    ;

    companion object {
        fun fromCode(code: String?): Audience? = entries.firstOrNull { it.name == code }
    }
}

/** The business type and audience together, with the §5.19 rules every screen asks about. */
data class BusinessKind(val type: BusinessType, val audience: Audience) {
    val isClinic: Boolean get() = type == BusinessType.CLINIC

    /** Bride bookings, `brideOnly` services and `brideQualified` staff: salons serving women (FEMALE or BOTH) only. */
    val brideAllowed: Boolean get() = type == BusinessType.SALON && audience != Audience.MALE

    /** The owner may widen a MALE or FEMALE salon to BOTH; clinics and BOTH salons never change. */
    val canWidenAudience: Boolean get() = type == BusinessType.SALON && audience != Audience.BOTH

    /** `gender` filter of `GET /catalog/services` (own audience + BOTH); null = every audience of the type. */
    val catalogGender: Audience? get() = audience.takeIf { type == BusinessType.SALON && it != Audience.BOTH }

    companion object {
        /** A clinic is always unisex; a salon keeps the audience it chose (null while not chosen). */
        fun of(type: BusinessType, audience: Audience?): BusinessKind? = when (type) {
            BusinessType.CLINIC -> BusinessKind(type, Audience.BOTH)
            BusinessType.SALON -> audience?.let { BusinessKind(type, it) }
        }
    }
}
