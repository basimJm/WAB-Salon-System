package com.fab.wab.merchant.feature.salon.presentation.controller.contract

import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.feature.salon.domain.HubEntry
import com.fab.wab.merchant.feature.salon.domain.HubTile

sealed interface SalonHubContract {
    data class UiState(
        val salon: SalonProfile? = null,
        val entries: List<HubEntry> = emptyList(),
        val refreshing: Boolean = false,
    ) {
        val noAccess: Boolean get() = entries.isEmpty()
    }

    sealed interface UiAction {
        data object OnRefresh : UiAction
        data class OnTileClick(val tile: HubTile) : UiAction
    }

    sealed interface SideEffect {
        data class Open(val tile: HubTile) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
