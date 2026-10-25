package com.fab.wab.merchant.feature.auth.domain.model

import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.MemberProfile
import kotlin.time.Instant

/** `POST /auth/otp/request`: the platform pre-check before Firebase sends the SMS (PRD M03). */
data class OtpPolicy(
    val allowed: Boolean,
    val otpLength: Int,
    val resendAfterSeconds: Int,
    val blockedUntil: Instant? = null,
)

/** `POST /auth/otp/wrong-attempt`: wrong codes count toward the 15-minute block. */
data class WrongAttemptResult(
    val blocked: Boolean,
    val attemptsRemaining: Int,
    val blockedUntil: Instant? = null,
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

/** A phone proven by Firebase for a non-login purpose; the calling flow (registration, bank details) consumes it. */
data class OtpVerified(
    val purpose: AuthPurpose,
    val phone: PhoneNumber,
    val idToken: String,
)

/** `+962791234567` from the country's dial code and the national number. */
fun PhoneNumber.toE164(dialCode: String): String = dialCode.trim() + number.trim()

/** Answer of `PUT /installations`: whether the backend linked the device to the signed-in member. */
data class InstallationLink(val installationId: String, val linked: Boolean)
