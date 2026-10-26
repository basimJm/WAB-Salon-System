package com.fab.wab.customer.feature.auth.domain.model

import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.session.UserProfile
import kotlin.time.Instant

/**
 * `POST /auth/otp/request` (BUSINESS_DOMAIN §3.1a): the server checks the limits and, when [allowed], sends the code on
 * WhatsApp. [expiresInSeconds] is the lifetime of the code just sent (0 when none was sent).
 */
data class OtpPolicy(
    val allowed: Boolean,
    val otpLength: Int,
    val resendAfterSeconds: Int,
    val expiresInSeconds: Int = 0,
    val blockedUntil: Instant? = null,
)

/** `POST /auth/otp/verify`: the signed single-use proof of the phone for one purpose, valid [expiresInSeconds]. */
data class OtpProof(
    val otpToken: String,
    val expiresInSeconds: Int,
)

/** What `POST /auth/login` (and later register) hands back: the token pair and the facts the session keeps. */
data class AuthSession(
    val tokens: AuthTokens,
    val user: UserProfile,
)

/** Device facts sent with login / register so the backend links the installation (PRD §14, installations). */
data class InstallationInfo(
    val installationId: String,
    val platform: String,
    val appVersion: String,
    val osVersion: String? = null,
    val deviceModel: String? = null,
    val fcmToken: String? = null,
) {
    companion object {
        private const val UNKNOWN_ID = "unknown"

        /** Firebase unavailable (no config yet): the contract still needs an installation; the backend sees the marker. */
        val UNKNOWN_INSTALLATION = InstallationInfo(installationId = UNKNOWN_ID, platform = UNKNOWN_ID, appVersion = UNKNOWN_ID)
    }
}

/**
 * A phone proven by the WhatsApp code for a non-login purpose; the calling flow (register, change phone, booking)
 * consumes it. [otpToken] is single use: a failed action needs a new code.
 */
data class OtpVerified(
    val purpose: AuthPurpose,
    val phone: PhoneNumber,
    val otpToken: String,
)

/** `+962791234567` from the country's dial code and the national number. */
fun PhoneNumber.toE164(dialCode: String): String = dialCode.trim() + number.trim()

/** Answer of `PUT /installations`: whether the backend linked the device to the signed-in customer. */
data class InstallationLink(val installationId: String, val linked: Boolean)
