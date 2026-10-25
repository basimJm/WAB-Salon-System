package com.fab.wab.merchant.feature.notifications.data.remote

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.GetNotificationsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetNotificationsUnreadCountData
import com.fab.wab.merchant.core.data.contract.generated.PostNotificationsReadBody
import com.fab.wab.merchant.core.data.contract.generated.PostNotificationsReadData
import com.fab.wab.merchant.feature.notifications.domain.model.NotificationFilters
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody

class NotificationsApi(private val client: HttpClient) {
    suspend fun list(filters: NotificationFilters, page: Int, pageSize: Int): BaseResponse<List<GetNotificationsDataItem>> =
        client.get(MerchantOperations.getNotifications.path) {
            parameter(QUERY_PAGE, page)
            parameter(QUERY_PAGE_SIZE, pageSize)
            filters.from?.let { parameter(QUERY_FROM, it) }
            filters.to?.let { parameter(QUERY_TO, it) }
            filters.query.takeIf { it.isNotBlank() }?.let { parameter(QUERY_TEXT, it) }
        }.body()

    suspend fun unreadCount(): BaseResponse<GetNotificationsUnreadCountData> =
        client.get(MerchantOperations.getNotificationsUnreadCount.path).body()

    suspend fun markRead(ids: List<String>): BaseResponse<PostNotificationsReadData> =
        client.post(MerchantOperations.postNotificationsRead.path) { setBody(PostNotificationsReadBody(ids)) }.body()

    private companion object {
        const val QUERY_PAGE = "page"
        const val QUERY_PAGE_SIZE = "pageSize"
        const val QUERY_FROM = "from"
        const val QUERY_TO = "to"
        const val QUERY_TEXT = "q"
    }
}
