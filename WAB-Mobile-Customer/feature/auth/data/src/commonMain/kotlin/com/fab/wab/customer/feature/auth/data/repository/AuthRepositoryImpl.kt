package com.fab.wab.customer.feature.auth.data.repository

import com.fab.wab.customer.core.data.contract.generated.PostAuthCheckPhoneBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthCheckPhoneBodyPhone
import com.fab.wab.customer.core.data.contract.generated.PostAuthLoginBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthLoginBodyPhone
import com.fab.wab.customer.core.data.contract.generated.PostAuthLogoutBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpRequestBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpWrongAttemptBody
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.auth.data.remote.AuthApi
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.WrongAttemptResult
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository

class AuthRepositoryImpl(private val api: AuthApi) : AuthRepository {

    override suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck> {
        val body = PostAuthCheckPhoneBody(
            phone = PostAuthCheckPhoneBodyPhone(countryCode = phone.countryCode, number = phone.number),
            purpose = purpose.code,
        )
        return phoneCheckOf(safeApiCall { api.checkPhone(body) })
    }

    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> =
        safeApiCall { api.requestOtp(PostAuthOtpRequestBody(phone = phoneE164, purpose = purpose.code)) }
            .mapSuccess { it.data.toDomain() }

    override suspend fun reportWrongAttempt(phoneE164: String): AppResult<WrongAttemptResult> =
        safeApiCall { api.wrongAttempt(PostAuthOtpWrongAttemptBody(phone = phoneE164)) }.mapSuccess { it.data.toDomain() }

    override suspend fun login(phone: PhoneNumber, idToken: String, installation: InstallationInfo?): AppResult<AuthSession> {
        val body = PostAuthLoginBody(
            phone = PostAuthLoginBodyPhone(countryCode = phone.countryCode, number = phone.number),
            idToken = idToken,
            installation = (installation ?: InstallationInfo.UNKNOWN_INSTALLATION).toLoginBody(),
        )
        return safeApiCall { api.login(body) }.mapSuccess { it.data.toDomain() }
    }

    override suspend fun register(request: RegisterRequest, installation: InstallationInfo?): AppResult<AuthSession> {
        val body = request.toBody(installation ?: InstallationInfo.UNKNOWN_INSTALLATION)
        return safeApiCall { api.register(body) }.mapSuccess { it.data.toDomain() }
    }

    override suspend fun logout(refreshToken: String): AppResult<Unit> =
        safeApiCall { api.logout(PostAuthLogoutBody(refreshToken = refreshToken)) }.mapSuccess { }
}

/** The contract answers the expected outcomes as error codes (404 / 403 / 409); anything else stays an error. */
fun phoneCheckOf(result: AppResult<*>): AppResult<PhoneCheck> = when (result) {
    is AppResult.Success -> AppResult.Success(PhoneCheck.REGISTERED)
    is AppResult.Error -> when ((result.appError as? AppError.ServerError)?.code) {
        ErrorCode.PHONE_NOT_REGISTERED -> AppResult.Success(PhoneCheck.NOT_REGISTERED)
        ErrorCode.ACCOUNT_BLOCKED -> AppResult.Success(PhoneCheck.BLOCKED)
        ErrorCode.PHONE_ALREADY_REGISTERED -> AppResult.Success(PhoneCheck.ALREADY_REGISTERED)
        else -> result
    }
    AppResult.Loading -> AppResult.Loading
}
