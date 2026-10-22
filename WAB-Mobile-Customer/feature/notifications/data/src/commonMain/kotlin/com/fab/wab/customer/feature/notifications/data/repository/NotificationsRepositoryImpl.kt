package com.fab.wab.customer.feature.notifications.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetNotificationsDataItem
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.notifications.data.remote.NotificationsApi
import com.fab.wab.customer.feature.notifications.domain.model.Notification
import com.fab.wab.customer.feature.notifications.domain.model.NotificationFilters
import com.fab.wab.customer.feature.notifications.domain.repository.NotificationsRepository

class NotificationsRepositoryImpl(private val api: NotificationsApi) : NotificationsRepository {
    override suspend fun list(filters: NotificationFilters, page: Int, pageSize: Int): AppResult<List<Notification>> =
        safeApiCall { api.list(filters, page, pageSize) }.mapSuccess { response -> response.data.map { it.toDomain() } }

    override suspend fun unreadCount(): AppResult<Int> = safeApiCall { api.unreadCount() }.mapSuccess { it.data.unread }

    override suspend fun markRead(ids: List<String>): AppResult<Int> = safeApiCall { api.markRead(ids) }.mapSuccess { it.data.unread }
}

fun GetNotificationsDataItem.toDomain(): Notification = Notification(
    id = id,
    type = type,
    event = event,
    title = title,
    body = body,
    isRead = isRead,
    createdAt = createdAt,
    bookingId = data.bookingId,
    salonId = data.salonId,
)
