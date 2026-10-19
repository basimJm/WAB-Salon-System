package com.fab.wab.customer.core.data.favorites

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.DeleteFavoritesBySalonIdData
import com.fab.wab.customer.core.data.contract.generated.GetFavoritesDataItem
import com.fab.wab.customer.core.data.contract.generated.PutFavoritesBySalonIdData
import com.fab.wab.customer.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.put

class FavoritesApi(private val client: HttpClient) {
    suspend fun list(page: Int, pageSize: Int): BaseResponse<List<GetFavoritesDataItem>> =
        client.get(CustomerOperations.getFavorites.path) {
            parameter(QUERY_PAGE, page)
            parameter(QUERY_PAGE_SIZE, pageSize)
        }.body()

    suspend fun add(salonId: String): BaseResponse<PutFavoritesBySalonIdData> {
        val op = CustomerOperations.putFavoritesBySalonId
        return client.put(op.pathWith(op.pathParams.single() to salonId)).body()
    }

    suspend fun remove(salonId: String): BaseResponse<DeleteFavoritesBySalonIdData> {
        val op = CustomerOperations.deleteFavoritesBySalonId
        return client.delete(op.pathWith(op.pathParams.single() to salonId)).body()
    }
}

private const val QUERY_PAGE = "page"
private const val QUERY_PAGE_SIZE = "pageSize"
