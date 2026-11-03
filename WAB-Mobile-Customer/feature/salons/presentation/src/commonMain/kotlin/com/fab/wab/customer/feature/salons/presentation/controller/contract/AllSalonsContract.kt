package com.fab.wab.customer.feature.salons.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.feature.salons.domain.model.SearchSuggestions
import com.fab.wab.customer.feature.salons.domain.model.SuggestedService
import com.fab.wab.customer.feature.salons.domain.model.SuggestionRow
import com.fab.wab.customer.feature.salons.domain.model.rows

/** How S04 was opened (PRD S04 entry table); becomes the initial [SalonFilters]. No gender: §5.22 has no gender filter. */
data class AllSalonsEntry(
    val serviceId: String? = null,
    val serviceName: String? = null,
    val filter: SalonListFilter? = null,
    /** The Home lens or the tapped service's type; null lists every type. */
    val businessType: BusinessType? = null,
)

/** One active-filter chip (PRD S04 item 3); the id tells the view model which filter to drop. */
sealed interface FilterChipId {
    data class Service(val serviceId: String) : FilterChipId
    data object Price : FilterChipId
    data object General : FilterChipId
    data object Rating : FilterChipId
    data class Type(val type: BusinessType) : FilterChipId
    data object Gender : FilterChipId
    data object OpenNow : FilterChipId
}

/** Quick chips under the search field (BUSINESS_DOMAIN §5.22): Open now · Nearest · rating · price. */
enum class QuickChip { OPEN_NOW, NEAREST, TOP_RATED, PRICE }

sealed interface AllSalonsContract {

    enum class SalonsDialog { LocationExplanation, LocationDenied, AuthRequired }

    data class UiState(
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
        val suggestions: SearchSuggestions = SearchSuggestions.NONE,
        /** True while the customer types; a submit, a suggestion or a recent search hides the list. */
        val suggesting: Boolean = false,
        val recent: List<String> = emptyList(),
    ) {
        val generalFilter: GeneralFilter? get() = filters.general
        val lens: BusinessType? get() = filters.singleBusinessType
        val showSuggestions: Boolean get() = suggesting && text.isNotBlank() && !suggestions.isEmpty
        val suggestionRows: List<SuggestionRow> get() = if (showSuggestions) suggestions.rows() else emptyList()
        val showRecent: Boolean get() = text.isBlank() && recent.isNotEmpty()
        /** "Open now" is applied on the device: the contract has no open-now filter. */
        val visibleSalons: List<SalonSummary> get() = if (filters.openNow) salons.filter { it.isOpenNow } else salons
    }

    sealed interface UiAction {
        data class OnTextChange(val value: String) : UiAction
        data object OnSearchSubmit : UiAction
        data object OnFilterClick : UiAction
        data class OnLensSelect(val type: BusinessType?) : UiAction
        data class OnQuickChip(val chip: QuickChip) : UiAction
        data class OnChipRemove(val chip: FilterChipId) : UiAction
        data class OnSuggestedServiceClick(val service: SuggestedService) : UiAction
        data class OnSuggestedPlaceClick(val salonId: String) : UiAction
        data class OnRecentClick(val text: String) : UiAction
        data object OnRecentClear : UiAction
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
