package com.fab.wab.merchant.feature.auth.domain.model

import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.MemberProfile
import kotlin.time.Instant

/**
 * `POST /auth/otp/request` (BUSINESS_DOMAIN §3.1a): the limits run first, then the backend sends the code over
 * WhatsApp. [expiresInSeconds] is how long that code lives (0 when nothing was sent, `allowed = false`).
 */
data class OtpPolicy(
    val allowed: Boolean,
    val otpLength: Int,
    val resendAfterSeconds: Int,
    val expiresInSeconds: Int = 0,
    val blockedUntil: Instant? = null,
)

/** `POST /auth/otp/verify`: the right code is exchanged for a short-lived, single-use `otpToken`. */
data class OtpProof(
    val otpToken: String,
    val expiresInSeconds: Int,
)

/** What `POST /auth/login` (and the salon application) hands back: tokens, the member and their permission keys. */
data class AuthSession(
    val tokens: AuthTokens,
    val member: MemberProfile,
    val permissions: Set<String>,
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
 * A phone proven by the WhatsApp OTP for a non-login purpose; the calling flow (registration, change phone, bank
 * details) consumes it once: [otpToken] is single use and the backend rejects it after its lifetime.
 */
data class OtpVerified(
    val purpose: AuthPurpose,
    val phone: PhoneNumber,
    val otpToken: String,
)

/** `+962791234567` from the country's dial code and the national number. */
fun PhoneNumber.toE164(dialCode: String): String = dialCode.trim() + number.trim()

/**
 * `+962 7 9123 4567` for "we sent a code to": the dial code, then the national number grouped like the design
 * (`phoneFmt`: first digit, next four, the rest). Short numbers stay ungrouped.
 */
fun PhoneNumber.toDisplay(dialCode: String): String {
    val national = number.trim()
    val grouped = if (national.length > PHONE_GROUP_SECOND_END) {
        listOf(
            national.substring(0, PHONE_GROUP_FIRST_END),
            national.substring(PHONE_GROUP_FIRST_END, PHONE_GROUP_SECOND_END),
            national.substring(PHONE_GROUP_SECOND_END),
        ).joinToString(PHONE_GROUP_SEPARATOR)
    } else {
        national
    }
    val dial = dialCode.trim()
    return if (dial.isEmpty()) grouped else dial + PHONE_GROUP_SEPARATOR + grouped
}

private const val PHONE_GROUP_FIRST_END = 1
private const val PHONE_GROUP_SECOND_END = 5
private const val PHONE_GROUP_SEPARATOR = " "

/** Answer of `PUT /installations`: whether the backend linked the device to the signed-in member. */
data class InstallationLink(val installationId: String, val linked: Boolean)
