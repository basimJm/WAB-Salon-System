package com.fab.wab.customer.core.domain.session

/** The two salon genders of the marketplace (BUSINESS_DOMAIN enums); the customer's scope on Home. */
enum class Gender(val code: String) {
    MALE("MALE"),
    FEMALE("FEMALE"),
    ;

    companion object {
        /** Null for an unknown or missing stored value, never a crash on legacy data. */
        fun fromCode(code: String?): Gender? = entries.firstOrNull { it.code.equals(code?.trim(), ignoreCase = true) }
    }
}
