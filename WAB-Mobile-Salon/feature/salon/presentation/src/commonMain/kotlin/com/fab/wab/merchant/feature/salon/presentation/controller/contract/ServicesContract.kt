package com.fab.wab.merchant.feature.salon.presentation.controller.contract

import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.feature.salon.domain.CatalogService
import com.fab.wab.merchant.feature.salon.domain.SalonService
import com.fab.wab.merchant.feature.salon.domain.matching

sealed interface ServicesContract {
    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val error: String? = null,
        val services: List<SalonService> = emptyList(),
        val query: String = "",
        val confirmDeactivate: String? = null,
        val toggling: Set<String> = emptySet(),
        val branchScope: BranchScope = BranchScope(),
    ) {
        val shown: List<SalonService> get() = services.matching(query) { it.name }
        val isEmpty: Boolean get() = !loading && error == null && services.isEmpty()
    }

    sealed interface UiAction {
        data class OnQuery(val value: String) : UiAction
        data class OnToggle(val id: String, val active: Boolean) : UiAction
        data object OnConfirmDeactivate : UiAction
        data object OnDismiss : UiAction
        data class OnServiceClick(val id: String) : UiAction
        data object OnAdd : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data class OnBranchSelect(val branchId: String?) : UiAction
    }

    sealed interface SideEffect {
        data class OpenService(val id: String) : SideEffect
        data object OpenCatalog : SideEffect
        data class Toggled(val active: Boolean) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

sealed interface CatalogPickerContract {
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        /** The business type + audience whose catalog is shown (BUSINESS_DOMAIN §5.19). */
        val kind: BusinessKind? = null,
        val items: List<CatalogService> = emptyList(),
        val added: Map<String, String> = emptyMap(),
        val query: String = "",
        val hasMore: Boolean = false,
        val loadingMore: Boolean = false,
    ) {
        val shown: List<CatalogService> get() = items.matching(query) { it.name }
    }

    sealed interface UiAction {
        data class OnQuery(val value: String) : UiAction
        data class OnItemClick(val id: String) : UiAction
        data object OnLoadMore : UiAction
        data object OnRequest : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data class OpenNew(val catalogId: String) : SideEffect
        data class OpenExisting(val serviceId: String) : SideEffect
        data object OpenRequests : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
