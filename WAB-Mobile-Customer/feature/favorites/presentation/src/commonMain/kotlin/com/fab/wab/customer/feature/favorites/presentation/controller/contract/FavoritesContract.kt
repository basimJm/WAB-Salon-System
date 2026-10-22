package com.fab.wab.customer.feature.favorites.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.SalonSummary

sealed interface FavoritesContract {

    data class UiState(
        val signedIn: Boolean? = null,
        /** First name (registered) or nickname (guest) for the "Hello, …" header of S20. */
        val greetingName: String = "",
        val loading: Boolean = false,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val hasMore: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val loaded: Boolean = false,
        val salons: List<SalonSummary> = emptyList(),
    )

    sealed interface UiAction {
        data object OnLoginClick : UiAction
        data object OnExploreClick : UiAction
        data class OnSalonClick(val salonId: String) : UiAction
        data class OnRemoveClick(val salonId: String) : UiAction
        data object OnLoadMore : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data object OnResume : UiAction
    }

    sealed interface SideEffect {
        data object OpenLogin : SideEffect
        data object OpenHome : SideEffect
        data class OpenSalon(val salonId: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
