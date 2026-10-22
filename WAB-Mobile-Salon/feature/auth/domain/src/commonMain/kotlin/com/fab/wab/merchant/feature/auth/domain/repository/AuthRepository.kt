package com.fab.wab.merchant.feature.auth.domain.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.AuthSession
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.PhoneCheck
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.model.WrongAttemptResult

interface AuthRepository {
    suspend fun checkPhone(phone: PhoneNumber): AppResult<PhoneCheck>

    suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy>

    suspend fun reportWrongAttempt(phoneE164: String): AppResult<WrongAttemptResult>

    suspend fun login(phone: PhoneNumber, idToken: String, installation: InstallationInfo?): AppResult<AuthSession>

    /** `POST /auth/logout`: revokes the refresh token and unlinks the device. */
    suspend fun logout(refreshToken: String): AppResult<Unit>
}
