package com.fab.wab.customer.core.domain

/**
 * The `error.code` values of the backend envelope (BUSINESS_DOMAIN §11, `openapi.customer.json`).
 * Clients branch on the code, never on the message; an unlisted value maps to [UNKNOWN].
 */
enum class ErrorCode {
    VALIDATION_ERROR,
    UNAUTHORIZED,
    FORBIDDEN,
    PERMISSION_DENIED,
    NOT_FOUND,
    CONFLICT,
    RATE_LIMITED,
    INTERNAL,
    OTP_BLOCKED,
    OTP_INVALID,
    OTP_EXPIRED,
    PHONE_NOT_REGISTERED,
    PHONE_ALREADY_REGISTERED,
    ACCOUNT_BLOCKED,
    MEMBER_INACTIVE,
    SALON_NOT_FOUND,
    SALON_NOT_BOOKABLE,
    SALON_CLOSED,
    GENDER_MISMATCH,
    TOO_MANY_COMPANIONS,
    SERVICE_UNAVAILABLE,
    BRIDE_ONLY_SERVICE,
    STAFF_NOT_ELIGIBLE,
    SLOT_UNAVAILABLE,
    SLOT_TAKEN,
    DATE_OUT_OF_RANGE,
    PAYMENT_FAILED,
    PAYMENT_NOT_VERIFIED,
    PAYMENT_OPTION_NOT_ALLOWED,
    DRAFT_EXPIRED,
    INVALID_TRANSITION,
    CANCELLATION_WINDOW_PASSED,
    TOO_EARLY_TO_COMPLETE,
    ALREADY_HANDLED,
    SCHEDULE_CONFLICT,
    OWNER_REQUIRED,
    LAST_OWNER,
    UPLOAD_INVALID,
    UPLOAD_TOO_LARGE,
    MAINTENANCE,
    UPDATE_REQUIRED,
    UNKNOWN,
    ;

    companion object {
        fun fromServer(code: String?): ErrorCode = entries.firstOrNull { it.name == code } ?: UNKNOWN
    }
}
