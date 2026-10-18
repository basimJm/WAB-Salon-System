package com.fab.wab.customer.feature.auth.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.PostAuthCheckPhoneBody
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement

/** Auth endpoints of the contract; bodies and paths come from the generated registry, never literals. */
class AuthApi(private val client: HttpClient) {
    suspend fun checkPhone(body: PostAuthCheckPhoneBody): BaseResponse<JsonElement?> =
        client.post(CustomerOperations.postAuthCheckPhone.path) { setBody(body) }.body()
}
