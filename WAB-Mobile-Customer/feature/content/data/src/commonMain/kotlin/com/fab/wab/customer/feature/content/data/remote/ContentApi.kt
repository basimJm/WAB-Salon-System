package com.fab.wab.customer.feature.content.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetContentFaqsDataItem
import com.fab.wab.customer.core.data.contract.generated.GetContentPagesBySlugData
import com.fab.wab.customer.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class ContentApi(private val client: HttpClient) {
    suspend fun page(slug: String): BaseResponse<GetContentPagesBySlugData> {
        val op = CustomerOperations.getContentPagesBySlug
        return client.get(op.pathWith(op.pathParams.single() to slug)).body()
    }

    suspend fun faqs(): BaseResponse<List<GetContentFaqsDataItem>> = client.get(CustomerOperations.getContentFaqs.path).body()
}
