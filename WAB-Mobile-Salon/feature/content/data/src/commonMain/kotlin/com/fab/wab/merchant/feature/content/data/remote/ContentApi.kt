package com.fab.wab.merchant.feature.content.data.remote

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.GetContentFaqsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetContentPagesBySlugData
import com.fab.wab.merchant.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class ContentApi(private val client: HttpClient) {
    suspend fun page(slug: String): BaseResponse<GetContentPagesBySlugData> {
        val op = MerchantOperations.getContentPagesBySlug
        return client.get(op.pathWith(op.pathParams.single() to slug)).body()
    }

    suspend fun faqs(): BaseResponse<List<GetContentFaqsDataItem>> = client.get(MerchantOperations.getContentFaqs.path).body()
}
