package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PatchSalonAudienceBody
import com.fab.wab.merchant.core.data.contract.generated.PatchSalonAudienceData
import com.fab.wab.merchant.core.domain.salon.Audience
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

    /** Owner only (BUSINESS_DOMAIN §5.19): a MALE or FEMALE salon serves BOTH from now on. */
    suspend fun widenAudience(): BaseResponse<PatchSalonAudienceData> =
        client.patch(MerchantOperations.patchSalonAudience.path) { setBody(PatchSalonAudienceBody(Audience.BOTH.name)) }.body()
}
