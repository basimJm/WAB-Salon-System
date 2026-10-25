package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.patch
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

class SalonProfileApi(private val client: HttpClient) {
    /** The body is built field by field so a cleared value goes out as an explicit `null` (the client omits nulls). */
    suspend fun update(body: JsonObject): BaseResponse<JsonElement?> =
        client.patch(MerchantOperations.patchSalonProfile.path) { setBody(body) }.body()
}
