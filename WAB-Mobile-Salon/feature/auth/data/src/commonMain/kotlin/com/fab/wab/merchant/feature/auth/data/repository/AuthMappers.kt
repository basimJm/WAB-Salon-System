package com.fab.wab.merchant.feature.auth.data.repository

import com.fab.wab.merchant.core.data.contract.generated.MemberProfile as MemberDto
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginBodyInstallation
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpVerifyData
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.feature.auth.domain.model.AuthSession
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.OtpProof
import kotlin.time.Instant

/** A malformed timestamp from the server must not crash the flow: it reads as "not blocked". */
internal fun parseInstantOrNull(value: String?): Instant? =
    value?.let { runCatching { Instant.parse(it) }.getOrNull() }

fun PostAuthOtpRequestData.toDomain(): OtpPolicy = OtpPolicy(
    allowed = allowed,
    otpLength = otpLength,
    resendAfterSeconds = resendAfterSeconds,
    expiresInSeconds = expiresInSeconds,
    blockedUntil = parseInstantOrNull(blockedUntil),
)

fun PostAuthOtpVerifyData.toDomain(): OtpProof = OtpProof(otpToken = otpToken, expiresInSeconds = expiresInSeconds)

/**
 * Unknown roles read as the most restricted one (EMPLOYEE); access itself comes from the permission keys. The
 * branch (SRV-149, null for the owner) sets the member's scope from sign-in on (MER-069).
 */
fun MemberDto.toDomain(): MemberProfile {
    val memberRole = MemberRole.fromCode(role) ?: MemberRole.EMPLOYEE
    return MemberProfile(
        id = id,
        salonId = salonId,
        firstName = firstName,
        role = memberRole,
        // Same rule as the token refresh (RemoteTokenRefreshApi): the owner has no branch, a blank id is none.
        branchId = branchId?.takeIf { memberRole != MemberRole.OWNER && it.isNotBlank() },
    )
}

fun PostAuthLoginData.toDomain(): AuthSession = AuthSession(
    tokens = AuthTokens(accessToken = accessToken, refreshToken = refreshToken),
    member = member.toDomain(),
    permissions = member.permissions.toSet(),
)

fun InstallationInfo.toLoginBody(): PostAuthLoginBodyInstallation = PostAuthLoginBodyInstallation(
    installationId = installationId,
    platform = platform,
    appVersion = appVersion,
    osVersion = osVersion,
    deviceModel = deviceModel,
    fcmToken = fcmToken,
)
