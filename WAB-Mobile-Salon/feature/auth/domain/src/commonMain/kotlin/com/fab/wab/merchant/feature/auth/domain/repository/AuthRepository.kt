package com.fab.wab.merchant.feature.auth.domain.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.AuthSession
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.OtpProof
import com.fab.wab.merchant.feature.auth.domain.model.PhoneCheck
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber

interface AuthRepository {
    suspend fun checkPhone(phone: PhoneNumber): AppResult<PhoneCheck>

    suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy>

    /** Wrong codes count toward the block on the server (`OTP_INVALID`, then `OTP_BLOCKED`). */
    suspend fun verifyOtp(phoneE164: String, purpose: AuthPurpose, code: String): AppResult<OtpProof>

    suspend fun login(phone: PhoneNumber, otpToken: String, installation: InstallationInfo?): AppResult<AuthSession>

    /** `POST /auth/logout`: revokes the refresh token and unlinks the device. */
    suspend fun logout(refreshToken: String): AppResult<Unit>
}
