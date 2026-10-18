package com.fab.wab.customer.feature.auth.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.PostAuthCheckPhoneBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthLoginBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpRequestBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpWrongAttemptBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpWrongAttemptData
import com.fab.wab.customer.core.data.contract.generated.PostAuthRegisterBody
import com.fab.wab.customer.core.data.contract.generated.PostAuthRegisterData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement

/** Auth endpoints of the contract; bodies and paths come from the generated registry, never literals. */
class AuthApi(private val client: HttpClient) {
    suspend fun checkPhone(body: PostAuthCheckPhoneBody): BaseResponse<JsonElement?> =
        client.post(CustomerOperations.postAuthCheckPhone.path) { setBody(body) }.body()

    suspend fun requestOtp(body: PostAuthOtpRequestBody): BaseResponse<PostAuthOtpRequestData> =
        client.post(CustomerOperations.postAuthOtpRequest.path) { setBody(body) }.body()

    suspend fun wrongAttempt(body: PostAuthOtpWrongAttemptBody): BaseResponse<PostAuthOtpWrongAttemptData> =
        client.post(CustomerOperations.postAuthOtpWrongAttempt.path) { setBody(body) }.body()

    suspend fun login(body: PostAuthLoginBody): BaseResponse<PostAuthLoginData> =
        client.post(CustomerOperations.postAuthLogin.path) { setBody(body) }.body()

    suspend fun register(body: PostAuthRegisterBody): BaseResponse<PostAuthRegisterData> =
        client.post(CustomerOperations.postAuthRegister.path) { setBody(body) }.body()
}
