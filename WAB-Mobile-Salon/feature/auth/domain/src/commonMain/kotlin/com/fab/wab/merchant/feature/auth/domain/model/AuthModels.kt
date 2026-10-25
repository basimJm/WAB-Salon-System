package com.fab.wab.merchant.feature.auth.domain.model

/** A number as the backend addresses it: ISO country + national number without the trunk zero. */
data class PhoneNumber(val countryCode: String, val number: String)

/** `purpose` of the OTP pre-check (contract enum, PRD M03 modes). */
enum class AuthPurpose(val code: String) {
    LOGIN("LOGIN"),
    REGISTER("REGISTER"),
    CHANGE_PHONE("CHANGE_PHONE"),
    BANK_DETAILS("BANK_DETAILS"),
    ;

    companion object {
        fun fromCode(code: String?): AuthPurpose = entries.firstOrNull { it.code == code } ?: LOGIN
    }
}

/** Outcome of `POST /auth/check-phone` (PRD §4.4): the backend answers with error codes, the app with a value. */
enum class PhoneCheck {
    /** An active member: continue to the OTP. */
    REGISTERED,

    /** "This number is not linked to any salon": offer to register a new salon. */
    NOT_REGISTERED,

    /** The salon owner deactivated this member. */
    INACTIVE,

    /** The account is blocked by WAB. */
    BLOCKED,
}
