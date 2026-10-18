package com.fab.wab.customer.core.data.favorites

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.DeleteFavoritesBySalonIdData
import com.fab.wab.customer.core.data.contract.generated.PutFavoritesBySalonIdData
import com.fab.wab.customer.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.put

class FavoritesApi(private val client: HttpClient) {
    suspend fun add(salonId: String): BaseResponse<PutFavoritesBySalonIdData> {
        val op = CustomerOperations.putFavoritesBySalonId
        return client.put(op.pathWith(op.pathParams.single() to salonId)).body()
    }

    suspend fun remove(salonId: String): BaseResponse<DeleteFavoritesBySalonIdData> {
        val op = CustomerOperations.deleteFavoritesBySalonId
        return client.delete(op.pathWith(op.pathParams.single() to salonId)).body()
    }
}
