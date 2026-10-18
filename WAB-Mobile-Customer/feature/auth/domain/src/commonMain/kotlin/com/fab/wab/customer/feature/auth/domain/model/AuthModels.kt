package com.fab.wab.customer.feature.auth.domain.model

/** A number as the backend addresses it: ISO country + national number without the trunk zero. */
data class PhoneNumber(val countryCode: String, val number: String)

/** `purpose` of the auth and OTP calls (contract enum). */
enum class AuthPurpose(val code: String) {
    LOGIN("LOGIN"),
    REGISTER("REGISTER"),
    CHANGE_PHONE("CHANGE_PHONE"),
    BOOKING_CONFIRMATION("BOOKING_CONFIRMATION"),
    ;

    companion object {
        fun fromCode(code: String?): AuthPurpose = entries.firstOrNull { it.code == code } ?: LOGIN
    }
}

/** Outcome of `POST /auth/check-phone` (PRD S11): the backend answers with error codes, the app with a value. */
enum class PhoneCheck {
    /** Login may continue to the OTP; a deletion-grace account reactivates on login (PRD S11). */
    REGISTERED,
    NOT_REGISTERED,
    BLOCKED,
    ALREADY_REGISTERED,
}
