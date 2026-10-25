package com.fab.wab.merchant.feature.auth.data.repository

import com.fab.wab.merchant.core.data.contract.generated.MemberProfile as MemberDto
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginBodyInstallation
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpWrongAttemptData
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.feature.auth.domain.model.AuthSession
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.WrongAttemptResult
import kotlin.time.Instant

/** A malformed timestamp from the server must not crash the flow: it reads as "not blocked". */
internal fun parseInstantOrNull(value: String?): Instant? =
    value?.let { runCatching { Instant.parse(it) }.getOrNull() }

fun PostAuthOtpRequestData.toDomain(): OtpPolicy = OtpPolicy(
    allowed = allowed,
    otpLength = otpLength,
    resendAfterSeconds = resendAfterSeconds,
    blockedUntil = parseInstantOrNull(blockedUntil),
)

fun PostAuthOtpWrongAttemptData.toDomain(): WrongAttemptResult = WrongAttemptResult(
    blocked = blocked,
    attemptsRemaining = attemptsRemaining,
    blockedUntil = parseInstantOrNull(blockedUntil),
)

/** Unknown roles read as the most restricted one (EMPLOYEE); access itself comes from the permission keys. */
fun MemberDto.toDomain(): MemberProfile =
    MemberProfile(id = id, salonId = salonId, firstName = firstName, role = MemberRole.fromCode(role) ?: MemberRole.EMPLOYEE)

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
