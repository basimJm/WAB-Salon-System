package com.fab.wab.customer.feature.notifications.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.notifications.domain.model.Notification
import com.fab.wab.customer.feature.notifications.domain.model.NotificationDefaults
import com.fab.wab.customer.feature.notifications.domain.model.NotificationFilters
import com.fab.wab.customer.feature.notifications.domain.repository.NotificationsRepository

class LoadNotificationsUseCase(private val repository: NotificationsRepository) {
    suspend operator fun invoke(filters: NotificationFilters, page: Int): AppResult<List<Notification>> =
        repository.list(
            filters.copy(query = filters.query.trim().take(NotificationDefaults.MAX_QUERY_LENGTH)),
            page,
            NotificationDefaults.PAGE_SIZE,
        )
}

/** PRD S19: visible unread items are reported in the background; already-read ids are dropped before the call. */
class MarkNotificationsReadUseCase(private val repository: NotificationsRepository) {
    suspend operator fun invoke(items: List<Notification>): AppResult<Int>? {
        val ids = items.filterNot { it.isRead }.map { it.id }.distinct()
        return if (ids.isEmpty()) null else repository.markRead(ids)
    }
}

class GetUnreadCountUseCase(private val repository: NotificationsRepository) {
    suspend operator fun invoke(): AppResult<Int> = repository.unreadCount()
}
