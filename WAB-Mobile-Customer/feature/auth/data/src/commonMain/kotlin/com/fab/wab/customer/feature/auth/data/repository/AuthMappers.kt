package com.fab.wab.customer.feature.auth.data.repository

import com.fab.wab.customer.core.data.contract.generated.PostAuthLoginBodyInstallation
import com.fab.wab.customer.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpWrongAttemptData
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.WrongAttemptResult
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

fun PostAuthLoginData.toDomain(): AuthSession = AuthSession(
    tokens = AuthTokens(accessToken = accessToken, refreshToken = refreshToken),
    user = UserProfile(id = customer.id, firstName = customer.firstName, gender = Gender.fromCode(customer.gender)),
)

fun InstallationInfo.toLoginBody(): PostAuthLoginBodyInstallation = PostAuthLoginBodyInstallation(
    installationId = installationId,
    platform = platform,
    appVersion = appVersion,
    osVersion = osVersion,
    deviceModel = deviceModel,
    fcmToken = fcmToken,
)
