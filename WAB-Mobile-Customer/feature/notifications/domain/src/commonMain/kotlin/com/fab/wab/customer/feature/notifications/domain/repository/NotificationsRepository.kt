package com.fab.wab.customer.feature.notifications.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.notifications.domain.model.Notification
import com.fab.wab.customer.feature.notifications.domain.model.NotificationFilters

interface NotificationsRepository {
    suspend fun list(filters: NotificationFilters, page: Int, pageSize: Int): AppResult<List<Notification>>
    suspend fun unreadCount(): AppResult<Int>
    /** Returns the remaining unread count. */
    suspend fun markRead(ids: List<String>): AppResult<Int>
}
