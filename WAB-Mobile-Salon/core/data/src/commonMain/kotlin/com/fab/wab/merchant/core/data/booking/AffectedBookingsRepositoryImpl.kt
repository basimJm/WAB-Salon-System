package com.fab.wab.merchant.core.data.booking

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsCancelAffectedBody
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsCancelAffectedDataItem
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.AffectedBookingsRepository
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody

private const val OUTCOME_DONE = "DONE"

class AffectedBookingsApi(private val client: HttpClient) {
    suspend fun cancel(body: PostBookingsCancelAffectedBody): BaseResponse<List<PostBookingsCancelAffectedDataItem>> =
        client.post(MerchantOperations.postBookingsCancelAffected.path) { setBody(body) }.body()
}

class AffectedBookingsRepositoryImpl(private val api: AffectedBookingsApi) : AffectedBookingsRepository {
    override suspend fun cancel(bookingIds: List<String>, reasonCode: String, reasonText: String): AppResult<Boolean> =
        safeApiCall { api.cancel(PostBookingsCancelAffectedBody(reasonCode, reasonText.trim().ifEmpty { null }, bookingIds)) }
            .mapSuccess { response -> response.data.all { it.outcome == OUTCOME_DONE } }
}
