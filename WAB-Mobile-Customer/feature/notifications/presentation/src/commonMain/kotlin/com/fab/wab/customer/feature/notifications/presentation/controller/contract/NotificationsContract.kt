package com.fab.wab.customer.feature.notifications.presentation.controller.contract

import com.fab.wab.customer.feature.notifications.domain.model.Notification
import com.fab.wab.customer.feature.notifications.domain.model.NotificationFilters

/** Removable chips above the list (PRD S19). */
enum class NotificationChip { DATES, TEXT }

/** The filter sheet edits a copy; Apply commits it, Reset clears it. */
data class FilterDraft(val from: String = "", val to: String = "", val query: String = "") {
    /** `to` before `from` is rejected (ISO dates compare lexically). */
    val datesValid: Boolean get() = from.isBlank() || to.isBlank() || from <= to
}

sealed interface NotificationsContract {

    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val loaded: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val items: List<Notification> = emptyList(),
        val hasMore: Boolean = false,
        val filters: NotificationFilters = NotificationFilters(),
        val sheet: FilterDraft? = null,
        val selected: Notification? = null,
    ) {
        val chips: List<NotificationChip>
            get() = buildList {
                if (filters.from != null || filters.to != null) add(NotificationChip.DATES)
                if (filters.query.isNotBlank()) add(NotificationChip.TEXT)
            }
    }

    sealed interface UiAction {
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data object OnLoadMore : UiAction
        data class OnVisible(val ids: List<String>) : UiAction
        data class OnItemClick(val id: String) : UiAction
        data object OnPopupDismiss : UiAction
        data object OnViewBooking : UiAction
        data object OnFilterClick : UiAction
        data object OnSheetDismiss : UiAction
        data class OnDraftFromChange(val value: String) : UiAction
        data class OnDraftToChange(val value: String) : UiAction
        data class OnDraftQueryChange(val value: String) : UiAction
        data object OnApplyFilters : UiAction
        data object OnResetFilters : UiAction
        data class OnChipRemove(val chip: NotificationChip) : UiAction
    }

    sealed interface SideEffect {
        data class OpenBooking(val bookingId: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
