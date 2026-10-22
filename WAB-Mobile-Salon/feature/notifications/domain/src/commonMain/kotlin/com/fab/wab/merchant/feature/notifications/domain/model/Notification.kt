package com.fab.wab.merchant.feature.notifications.domain.model

/** `GET /notifications` item (PRD S19). [bookingId] marks a booking notification ("View booking"). */
data class Notification(
    val id: String,
    val type: String,
    val event: String,
    val title: String,
    val body: String,
    val isRead: Boolean,
    val createdAt: String,
    val bookingId: String?,
    val salonId: String?,
)

/** S19 filter sheet: ISO dates (`yyyy-MM-dd`) and a debounced search text. */
data class NotificationFilters(val from: String? = null, val to: String? = null, val query: String = "") {
    val isActive: Boolean get() = from != null || to != null || query.isNotBlank()
}

object NotificationDefaults {
    const val PAGE_SIZE = 10
    const val FIRST_PAGE = 1
    const val MAX_QUERY_LENGTH = 60
    const val SEARCH_DEBOUNCE_MS = 500L
}
