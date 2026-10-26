package com.fab.wab.customer.feature.auth.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.OtpProof
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest

interface AuthRepository {
    suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck>

    suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy>

    /** `POST /auth/otp/verify`: a wrong code counts toward the block on the server (`OTP_INVALID`, then `OTP_BLOCKED`). */
    suspend fun verifyOtp(phoneE164: String, purpose: AuthPurpose, code: String): AppResult<OtpProof>

    suspend fun login(phone: PhoneNumber, otpToken: String, installation: InstallationInfo?): AppResult<AuthSession>

    suspend fun register(request: RegisterRequest, installation: InstallationInfo?): AppResult<AuthSession>

    /** `POST /auth/logout`: revokes the refresh token and unlinks the device. */
    suspend fun logout(refreshToken: String): AppResult<Unit>

    /** `POST /auth/change-phone` with the OTP token of the NEW number (PRD S22); returns the updated local profile. */
    suspend fun changePhone(phone: PhoneNumber, otpToken: String): AppResult<UserProfile>
}
