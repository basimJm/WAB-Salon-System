package com.fab.wab.customer.feature.auth.domain.model

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.ErrorCode

/** How the OTP screen reacts to a failed request / verify / token use (BUSINESS_DOMAIN §3.1a, §11). */
sealed interface OtpFailure {
    /**
     * `OTP_INVALID` from `otp/verify`: [serverMessage] is the server's localized text with the attempts left
     * (`error.details[0]` on `body.code`), null when the server sent none.
     */
    data class InvalidCode(val serverMessage: String?) : OtpFailure

    /** `OTP_EXPIRED`, or an `otpToken` the action refused (expired / already used): a new code is needed. */
    data object Expired : OtpFailure

    /** `OTP_BLOCKED` (429): too many wrong codes or requests; the next request answers `blockedUntil`. */
    data object Blocked : OtpFailure

    /** `OTP_DELIVERY_FAILED` (422): the number is not on WhatsApp, no code was sent. */
    data object DeliveryFailed : OtpFailure

    /** Anything else (network, outage, validation): shown with the shared error text. */
    data class Other(val error: AppError) : OtpFailure
}

/** Field of the `OTP_INVALID` detail that carries the attempts-left text (`error.details[].field`). */
const val OTP_CODE_DETAIL_FIELD = "body.code"

/** Pure mapping so the screen never branches on HTTP status or message text, only on the error code. */
fun otpFailureOf(error: AppError): OtpFailure {
    val server = error as? AppError.ServerError ?: return OtpFailure.Other(error)
    return when (server.code) {
        ErrorCode.OTP_INVALID -> OtpFailure.InvalidCode(attemptsMessageOf(server))
        ErrorCode.OTP_EXPIRED -> OtpFailure.Expired
        ErrorCode.OTP_BLOCKED -> OtpFailure.Blocked
        ErrorCode.OTP_DELIVERY_FAILED -> OtpFailure.DeliveryFailed
        else -> OtpFailure.Other(error)
    }
}

/** The detail on `body.code` first (attempts left), else any `OTP_INVALID` detail; blank texts count as none. */
private fun attemptsMessageOf(error: AppError.ServerError): String? {
    val details = error.details.filter { it.code == ErrorCode.OTP_INVALID.name && it.message.isNotBlank() }
    return (details.firstOrNull { it.field == OTP_CODE_DETAIL_FIELD } ?: details.firstOrNull())?.message
}
