package com.fab.wab.customer.feature.salons.presentation.controller.contract

import com.fab.wab.customer.core.domain.catalog.CatalogService

sealed interface AllServicesContract {

    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val hasMore: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val loaded: Boolean = false,
        val services: List<CatalogService> = emptyList(),
    )

    sealed interface UiAction {
        data class OnServiceClick(val serviceId: String) : UiAction
        data object OnLoadMore : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        /** → S04 pre-filtered by that service (PRD S06). */
        data class OpenSalons(val serviceId: String, val serviceName: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
