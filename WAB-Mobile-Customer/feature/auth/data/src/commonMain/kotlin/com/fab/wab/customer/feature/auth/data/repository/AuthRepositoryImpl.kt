package com.fab.wab.customer.feature.auth.data.repository

import com.fab.wab.customer.core.data.contract.generated.PostAuthCheckPhoneBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthCheckPhoneBodyPhone
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.auth.data.remote.AuthApi
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository

class AuthRepositoryImpl(private val api: AuthApi) : AuthRepository {

    override suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck> {
        val body = PostAuthCheckPhoneBody(
            phone = PostAuthCheckPhoneBodyPhone(countryCode = phone.countryCode, number = phone.number),
            purpose = purpose.code,
        )
        return phoneCheckOf(safeApiCall { api.checkPhone(body) })
    }
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
