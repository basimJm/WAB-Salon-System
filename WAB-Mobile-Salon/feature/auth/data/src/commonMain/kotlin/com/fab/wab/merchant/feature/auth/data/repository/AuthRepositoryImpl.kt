package com.fab.wab.merchant.feature.auth.data.repository

import com.fab.wab.merchant.core.data.contract.generated.PostAuthCheckPhoneBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthCheckPhoneBodyPhone
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginBodyPhone
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLogoutBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpRequestBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpVerifyBody
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.auth.data.remote.AuthApi
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.AuthSession
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.OtpProof
import com.fab.wab.merchant.feature.auth.domain.model.PhoneCheck
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.repository.AuthRepository

class AuthRepositoryImpl(private val api: AuthApi) : AuthRepository {

    override suspend fun checkPhone(phone: PhoneNumber): AppResult<PhoneCheck> {
        val body = PostAuthCheckPhoneBody(phone = PostAuthCheckPhoneBodyPhone(countryCode = phone.countryCode, number = phone.number))
        return phoneCheckOf(safeApiCall { api.checkPhone(body) })
    }

    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> =
        safeApiCall { api.requestOtp(PostAuthOtpRequestBody(phone = phoneE164, purpose = purpose.code)) }
            .mapSuccess { it.data.toDomain() }

    override suspend fun verifyOtp(phoneE164: String, purpose: AuthPurpose, code: String): AppResult<OtpProof> =
        safeApiCall { api.verifyOtp(PostAuthOtpVerifyBody(phone = phoneE164, purpose = purpose.code, code = code)) }
            .mapSuccess { it.data.toDomain() }

    override suspend fun login(phone: PhoneNumber, otpToken: String, installation: InstallationInfo?): AppResult<AuthSession> {
        val body = PostAuthLoginBody(
            phone = PostAuthLoginBodyPhone(countryCode = phone.countryCode, number = phone.number),
            otpToken = otpToken,
            installation = (installation ?: InstallationInfo.UNKNOWN_INSTALLATION).toLoginBody(),
        )
        return safeApiCall { api.login(body) }.mapSuccess { it.data.toDomain() }
    }

    override suspend fun logout(refreshToken: String): AppResult<Unit> =
        safeApiCall { api.logout(PostAuthLogoutBody(refreshToken = refreshToken)) }.mapSuccess { }
}

/** PRD §4.4: the contract answers the expected outcomes as error codes (404 / 403); anything else stays an error. */
fun phoneCheckOf(result: AppResult<*>): AppResult<PhoneCheck> = when (result) {
    is AppResult.Success -> AppResult.Success(PhoneCheck.REGISTERED)
    is AppResult.Error -> when ((result.appError as? AppError.ServerError)?.code) {
        ErrorCode.PHONE_NOT_REGISTERED -> AppResult.Success(PhoneCheck.NOT_REGISTERED)
        ErrorCode.MEMBER_INACTIVE -> AppResult.Success(PhoneCheck.INACTIVE)
        ErrorCode.ACCOUNT_BLOCKED -> AppResult.Success(PhoneCheck.BLOCKED)
        else -> result
    }
    AppResult.Loading -> AppResult.Loading
}
