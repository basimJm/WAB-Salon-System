package com.fab.wab.customer.feature.salons.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetSalonsDataItem
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonQuery
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class SalonSearchApi(private val client: HttpClient) {
    suspend fun search(query: SalonQuery): BaseResponse<List<GetSalonsDataItem>> =
        client.get(CustomerOperations.getSalons.path) {
            parameter(Q.PAGE, query.page)
            parameter(Q.PAGE_SIZE, query.pageSize)
            parameter(Q.GENDER, query.gender.code)
            query.text.takeIf { it.isNotBlank() }?.let { parameter(Q.TEXT, it) }
            query.filters.services.forEach { parameter(Q.SERVICE_IDS, it.id) }
            query.filters.priceRange?.let {
                parameter(Q.MIN_PRICE, it.min)
                parameter(Q.MAX_PRICE, it.max)
            }
            query.filters.minRating?.let { parameter(Q.MIN_RATING, it) }
            when (query.filters.general) {
                GeneralFilter.RECOMMENDED -> parameter(Q.GENERAL, GENERAL_RECOMMENDED)
                GeneralFilter.NEAREST -> parameter(Q.SORT, SORT_NEAREST)
                null -> Unit
            }
            query.location?.let {
                parameter(Q.LAT, it.latitude)
                parameter(Q.LNG, it.longitude)
            }
        }.body()

    /** Query keys of `GET /salons` (contract). */
    private object Q {
        const val PAGE = "page"
        const val PAGE_SIZE = "pageSize"
        const val GENDER = "gender"
        const val TEXT = "q"
        const val SERVICE_IDS = "serviceIds"
        const val MIN_PRICE = "minPrice"
        const val MAX_PRICE = "maxPrice"
        const val MIN_RATING = "minRating"
        const val GENERAL = "general"
        const val LAT = "lat"
        const val LNG = "lng"
        const val SORT = "sort"
    }

    private companion object {
        const val GENERAL_RECOMMENDED = "RECOMMENDED"
        const val SORT_NEAREST = "NEAREST"
    }
}
