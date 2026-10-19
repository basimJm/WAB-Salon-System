package com.fab.wab.customer.feature.salons.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.navigation.route.SalonListFilter

/** How S04 was opened (PRD S04 entry table); becomes the initial [SalonFilters]. */
data class AllSalonsEntry(
    val serviceId: String? = null,
    val serviceName: String? = null,
    val filter: SalonListFilter? = null,
)

/** One active-filter chip (PRD S04 item 3); the id tells the view model which filter to drop. */
sealed interface FilterChipId {
    data class Service(val serviceId: String) : FilterChipId
    data object Price : FilterChipId
    data object General : FilterChipId
    data object Rating : FilterChipId
}

sealed interface AllSalonsContract {

    enum class SalonsDialog { LocationExplanation, LocationDenied, AuthRequired }

    data class UiState(
        val gender: Gender? = null,
        val text: String = "",
        val filters: SalonFilters = SalonFilters(),
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val hasMore: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val loaded: Boolean = false,
        val salons: List<SalonSummary> = emptyList(),
        val signedIn: Boolean = false,
        val dialog: SalonsDialog? = null,
    ) {
        val generalFilter: GeneralFilter? get() = filters.general
    }

    sealed interface UiAction {
        data class OnTextChange(val value: String) : UiAction
        data object OnFilterClick : UiAction
        data class OnChipRemove(val chip: FilterChipId) : UiAction
        data class OnSalonClick(val salonId: String) : UiAction
        data class OnFavoriteClick(val salonId: String) : UiAction
        data object OnLoadMore : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data object OnDialogConfirm : UiAction
        data object OnDialogDismiss : UiAction
        /** S05 (CUS-034) applies a new filter set. */
        data class OnFiltersApplied(val filters: SalonFilters) : UiAction
    }

    sealed interface SideEffect {
        data class OpenSalon(val salonId: String) : SideEffect
        data class OpenFilters(val filters: SalonFilters) : SideEffect
        data object OpenLogin : SideEffect
        data class ShowError(val message: String) : SideEffect
        data object NearestDropped : SideEffect
    }
}
