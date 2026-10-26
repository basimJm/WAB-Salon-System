package com.fab.wab.merchant.feature.auth.data.remote

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PostAuthCheckPhoneBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLogoutBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpRequestBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpVerifyBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpVerifyData
import com.fab.wab.merchant.core.network.client.publicRequest
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement

/** Merchant auth endpoints of the contract; bodies and paths come from the generated registry, never literals. */
class AuthApi(private val client: HttpClient) {
    suspend fun checkPhone(body: PostAuthCheckPhoneBody): BaseResponse<JsonElement?> =
        client.post(MerchantOperations.postAuthCheckPhone.path) { setBody(body) }.body()

    suspend fun requestOtp(body: PostAuthOtpRequestBody): BaseResponse<PostAuthOtpRequestData> =
        client.post(MerchantOperations.postAuthOtpRequest.path) { setBody(body) }.body()

    /** Public: a wrong code answers 401 `OTP_INVALID`, which must not trigger a token refresh and a second try. */
    suspend fun verifyOtp(body: PostAuthOtpVerifyBody): BaseResponse<PostAuthOtpVerifyData> =
        client.post(MerchantOperations.postAuthOtpVerify.path) {
            publicRequest()
            setBody(body)
        }.body()

    suspend fun login(body: PostAuthLoginBody): BaseResponse<PostAuthLoginData> =
        client.post(MerchantOperations.postAuthLogin.path) { setBody(body) }.body()

    suspend fun logout(body: PostAuthLogoutBody): BaseResponse<JsonElement?> =
        client.post(MerchantOperations.postAuthLogout.path) { setBody(body) }.body()
}
